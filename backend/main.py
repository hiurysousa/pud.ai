"""API do PUD.ai para quizzes gerados a partir do catálogo textual de PUDs."""

from __future__ import annotations

import logging
import os
import re
import unicodedata
import json
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from uuid import uuid4
from functools import lru_cache
from pathlib import Path

from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from agno.run import RunStatus
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator
from pypdf import PdfReader

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).with_name(".env"))

PDF_PUDS_PATH = Path(os.getenv("PUDS_PDF_PATH", str(Path(__file__).parent / "data" / "puds-bcc-textual.pdf")))
CATALOGO_PUDS_PATH = PDF_PUDS_PATH.with_name("catalogo-puds.md")
QUIZ_CACHE_PATH = PDF_PUDS_PATH.with_name("quiz-cache.json")
TOTAL_QUESTOES = 10
CACHE_VERSION = "v2"
MAX_CONTEXT_CHARS = 6500
MAX_QUESTOES_EXCLUIDAS = 20
MAX_CHARS_POR_EXCLUSAO = 120
EXECUTOR = ThreadPoolExecutor(max_workers=2)
JOBS: dict[str, dict] = {}
CACHE_FILE_LOCK = Lock()
DISCIPLINE_LOCKS_GUARD = Lock()
DISCIPLINE_LOCKS: dict[str, Lock] = {}

PERFIS_NIVEL = {
    "iniciante": (
        "cobre fundamentos, vocabulário e reconhecimento de conceitos; usa enunciados diretos "
        "e situações simples, sem exigir conhecimento além dos tópicos básicos"
    ),
    "intermediário": (
        "exige aplicação dos conceitos, comparação de alternativas e interpretação de pequenos "
        "cenários; evita perguntas que sejam apenas definições"
    ),
    "avançado": (
        "exige análise, escolha entre estratégias, consequências, limitações e casos complexos; "
        "evita perguntas de mera memorização"
    ),
}


class QuizGerado(BaseModel):
    pergunta: str = Field(min_length=5)
    alternativas: list[str] = Field(min_length=4, max_length=4)
    correta: str = Field(description="Letra A, B, C ou D da alternativa correta")
    explicacao: str = Field(min_length=5)

    @model_validator(mode="before")
    @classmethod
    def converter_texto_da_alternativa_em_letra(cls, dados: object) -> object:
        """Aceita provedores que retornam o texto correto em vez da letra A-D."""
        if not isinstance(dados, dict):
            return dados

        correta = dados.get("correta")
        alternativas = dados.get("alternativas")
        if not isinstance(correta, str) or not isinstance(alternativas, list):
            return dados

        resposta = " ".join(correta.split()).casefold()
        if resposta.upper() in {"A", "B", "C", "D"}:
            return dados

        for indice, alternativa in enumerate(alternativas[:4]):
            if isinstance(alternativa, str) and " ".join(alternativa.split()).casefold() == resposta:
                return {**dados, "correta": "ABCD"[indice]}
        return dados

    @field_validator("correta")
    @classmethod
    def validar_resposta(cls, value: str) -> str:
        letra = value.strip().upper()
        if letra not in {"A", "B", "C", "D"}:
            raise ValueError("correta deve ser uma das letras A, B, C ou D")
        return letra


class LoteQuiz(BaseModel):
    disciplina: str
    questoes: list[QuizGerado] = Field(min_length=TOTAL_QUESTOES, max_length=TOTAL_QUESTOES)

    @model_validator(mode="after")
    def validar_questoes_distintas(self) -> "LoteQuiz":
        perguntas = [normalizar(questao.pergunta) for questao in self.questoes]
        if len(set(perguntas)) != len(perguntas):
            raise ValueError("as perguntas do quiz devem ser distintas")

        for questao in self.questoes:
            alternativas = [normalizar(alternativa) for alternativa in questao.alternativas]
            if len(set(alternativas)) != len(alternativas):
                raise ValueError("as quatro alternativas de cada questão devem ser distintas")
        return self


class GerarQuizRequest(BaseModel):
    disciplina: str = Field(min_length=2, max_length=160)
    nivel: str = "iniciante"


class JobQuiz(BaseModel):
    id: str
    status: str
    lote: LoteQuiz | None = None
    erro: str | None = None


class PaginaPud(BaseModel):
    titulo: str
    texto: str


class DisciplinaCatalogo(BaseModel):
    nome: str
    topicos: str


app = FastAPI(title="PUD.ai API", version="0.2.0")
origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False if origins == ["*"] else True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def normalizar(texto: str) -> str:
    sem_acento = "".join(
        caractere
        for caractere in unicodedata.normalize("NFD", texto)
        if unicodedata.category(caractere) != "Mn"
    )
    return re.sub(r"\s+", " ", sem_acento).strip().upper()


def titulo_da_pagina(texto: str) -> str | None:
    """Extrai títulos como 'S1.3 - Introdução à Programação' do topo da página."""
    cabecalho = "\n".join(texto.splitlines()[:5])
    correspondencia = re.search(
        r"^\s*(?:[A-Z]{1,4}\s*)?\d+(?:\s*\.\s*\d+)?\s*[-–—]\s*(.+?)\s*$",
        cabecalho,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    return correspondencia.group(0).strip() if correspondencia else None


@lru_cache(maxsize=1)
def carregar_paginas_pud() -> tuple[PaginaPud, ...]:
    if not PDF_PUDS_PATH.is_file():
        raise HTTPException(status_code=503, detail="O catálogo textual de PUDs não foi encontrado no servidor.")

    try:
        leitor = PdfReader(str(PDF_PUDS_PATH), strict=False)
        paginas_lidas: list[PaginaPud] = []
        for numero, pagina in enumerate(leitor.pages, start=1):
            try:
                texto = pagina.extract_text() or ""
            except Exception:
                logger.warning("Não foi possível extrair o texto da página %s do catálogo", numero, exc_info=True)
                texto = ""
            paginas_lidas.append(PaginaPud(titulo=titulo_da_pagina(texto) or "", texto=texto))
        paginas = tuple(paginas_lidas)
    except Exception as exc:
        logger.exception("Não foi possível ler o catálogo de PUDs")
        raise HTTPException(status_code=503, detail="Não foi possível ler o catálogo textual de PUDs.") from exc

    if not any(pagina.titulo for pagina in paginas):
        raise HTTPException(status_code=422, detail="O catálogo não contém títulos de disciplinas reconhecíveis.")
    return paginas


def nome_da_disciplina(titulo: str) -> str:
    return re.sub(r"^\s*(?:[A-Z]{1,4}\s*)?\d+(?:\s*\.\s*\d+)?\s*[-–—]\s*", "", titulo).strip()


def gerar_catalogo_puds() -> list[DisciplinaCatalogo]:
    paginas = carregar_paginas_pud()
    inicios = [indice for indice, pagina in enumerate(paginas) if pagina.titulo]
    catalogo: list[DisciplinaCatalogo] = []

    for posicao, inicio in enumerate(inicios):
        fim = inicios[posicao + 1] if posicao + 1 < len(inicios) else len(paginas)
        texto = "\n".join(pagina.texto for pagina in paginas[inicio:fim]).strip()
        try:
            topicos = preparar_topicos_para_quiz(extrair_conteudos_programaticos(texto))
        except HTTPException:
            logger.warning("Não foi possível extrair os tópicos de %s", paginas[inicio].titulo)
            continue
        catalogo.append(DisciplinaCatalogo(nome=nome_da_disciplina(paginas[inicio].titulo), topicos=topicos))

    if not catalogo:
        raise RuntimeError("Nenhum PUD com tópicos programáticos foi encontrado.")
    CATALOGO_PUDS_PATH.write_text(serializar_catalogo_markdown(catalogo), encoding="utf-8")
    return catalogo


def serializar_catalogo_markdown(catalogo: list[DisciplinaCatalogo]) -> str:
    secoes = [
        "# Catálogo de conteúdos programáticos",
        "",
        "<!-- Arquivo gerado automaticamente a partir do PDF dos PUDs. -->",
    ]
    for disciplina in catalogo:
        nome = " ".join(disciplina.nome.split())
        secoes.extend(["", f"## {nome}", "", disciplina.topicos.strip()])
    return "\n".join(secoes).rstrip() + "\n"


def interpretar_catalogo_markdown(conteudo: str) -> tuple[DisciplinaCatalogo, ...]:
    cabecalhos = list(re.finditer(r"^##[ \t]+(.+?)\s*$", conteudo, flags=re.MULTILINE))
    if not cabecalhos:
        raise ValueError("O catálogo Markdown não contém disciplinas.")

    catalogo: list[DisciplinaCatalogo] = []
    for indice, cabecalho in enumerate(cabecalhos):
        inicio = cabecalho.end()
        fim = cabecalhos[indice + 1].start() if indice + 1 < len(cabecalhos) else len(conteudo)
        topicos = conteudo[inicio:fim].strip()
        if not topicos:
            raise ValueError(f"A disciplina '{cabecalho.group(1)}' não possui tópicos.")
        catalogo.append(DisciplinaCatalogo(nome=cabecalho.group(1).strip(), topicos=topicos))
    return tuple(catalogo)


@lru_cache(maxsize=1)
def carregar_catalogo_puds() -> tuple[DisciplinaCatalogo, ...]:
    if not CATALOGO_PUDS_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail="O catálogo ainda não foi preparado. Execute: python main.py --indexar-puds",
        )
    try:
        return interpretar_catalogo_markdown(CATALOGO_PUDS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError, ValidationError) as exc:
        raise HTTPException(status_code=503, detail="O catálogo Markdown de PUDs é inválido.") from exc


def localizar_topicos(disciplina: str) -> str:
    nome = normalizar(disciplina)
    catalogo = carregar_catalogo_puds()
    encontrada = next((item for item in catalogo if normalizar(item.nome) == nome), None)
    encontrada = encontrada or next((item for item in catalogo if nome in normalizar(item.nome)), None)
    encontrada = encontrada or next(
        (
            item
            for item in catalogo
            if SequenceMatcher(None, nome, normalizar(item.nome)).ratio() >= 0.78
        ),
        None,
    )
    if encontrada is None:
        raise HTTPException(
            status_code=404,
            detail={"mensagem": f"Disciplina '{disciplina}' não encontrada no catálogo.", "disciplinas_disponiveis": [item.nome for item in catalogo]},
        )
    return encontrada.topicos


def limitar_contexto(topicos: str, limite: int = MAX_CONTEXT_CHARS) -> str:
    """Evita enviar texto excessivo ao provedor sem cortar no meio de uma linha."""
    if len(topicos) <= limite:
        return topicos

    linhas: list[str] = []
    tamanho = 0
    for linha in topicos.splitlines():
        proximo_tamanho = tamanho + len(linha) + 1
        if proximo_tamanho > limite:
            break
        linhas.append(linha)
        tamanho = proximo_tamanho
    return "\n".join(linhas).strip()


def extrair_conteudos_programaticos(texto: str) -> str:
    """Seleciona os tópicos numerados do PUD localizado."""
    padrao_item = re.compile(r"(?<!\d)(\d{1,2}(?:\.\d{1,2})?)\s*[.)]\s+")
    itens = list(padrao_item.finditer(texto))
    if not itens:
        raise HTTPException(status_code=422, detail="O PUD não possui tópicos programáticos reconhecíveis.")

    inicio = itens[0].start()
    fim = len(texto)
    trecho = texto[inicio:]
    proxima_secao = re.search(
        r"\b(?:metodologia|avaliação|aulas?\s+(?:expositivas|dialogadas)|bibliografia|refer[eê]ncias)\b",
        trecho,
        flags=re.IGNORECASE,
    )
    if proxima_secao:
        fim = inicio + proxima_secao.start()

    conteudos = texto[inicio:fim].strip()
    if not conteudos:
        raise HTTPException(status_code=422, detail="A seção de conteúdos programáticos está vazia.")
    return conteudos


def preparar_topicos_para_quiz(conteudos: str) -> str:
    linhas_markdown: list[str] = []
    padrao_item = re.compile(r"^\s*(\d{1,2}(?:\s*\.\s*\d{1,2})*)\s*[.)]?\s*(.+?)\s*$")
    padrao_rodape = re.compile(
        r"(?:Coordenação do curso|IFCE/Campus|E-mail:|Fone:)",
        flags=re.IGNORECASE,
    )

    for linha_original in conteudos.splitlines():
        linha = " ".join(linha_original.split())
        if not linha or padrao_rodape.search(linha):
            continue

        item = padrao_item.match(linha)
        if item:
            numero = re.sub(r"\s+", "", item.group(1))
            texto = item.group(2).strip()
            if "." not in numero:
                linhas_markdown.extend(["", f"### {numero}. {texto}"])
            else:
                profundidade = max(0, numero.count(".") - 1)
                linhas_markdown.append(f"{'  ' * profundidade}- **{numero}.** {texto}")
            continue

        if linha == linha.upper() and any(caractere.isalpha() for caractere in linha):
            linhas_markdown.extend(["", f"### {linha}"])
        elif linhas_markdown:
            linhas_markdown[-1] = f"{linhas_markdown[-1]} {linha}"
        else:
            linhas_markdown.append(linha)

    return "\n".join(linhas_markdown).strip()


def validar_lote_do_provedor(conteudo: object) -> LoteQuiz:
    """Valida respostas estruturadas e recupera JSON quando o provedor inclui texto extra."""
    if not isinstance(conteudo, str):
        return LoteQuiz.model_validate(conteudo)

    try:
        return LoteQuiz.model_validate_json(conteudo)
    except ValidationError as primeiro_erro:
        # Alguns provedores devolvem uma introdução ou bloco Markdown antes do JSON.
        # Procuramos cada objeto JSON possível e aceitamos somente o que passa no schema.
        decoder = json.JSONDecoder()
        for inicio in (indice for indice, caractere in enumerate(conteudo) if caractere == "{"):
            try:
                objeto, _ = decoder.raw_decode(conteudo[inicio:])
                return LoteQuiz.model_validate(objeto)
            except (json.JSONDecodeError, ValidationError):
                continue
        raise primeiro_erro


def conteudo_indica_falha_do_provedor(conteudo: object) -> bool:
    if conteudo is None:
        return True
    return isinstance(conteudo, str) and conteudo.strip().casefold() in {
        "",
        "provider returned error",
    }


def formatar_exclusoes(perguntas: list[str]) -> str:
    """Mantém as exclusões úteis sem transformar o prompt em uma segunda ementa."""
    compactadas: list[str] = []
    vistas: set[str] = set()
    for pergunta in reversed(perguntas):
        texto = " ".join(pergunta.split())
        assinatura = normalizar(texto)
        if not texto or assinatura in vistas:
            continue
        vistas.add(assinatura)
        if len(texto) > MAX_CHARS_POR_EXCLUSAO:
            texto = texto[: MAX_CHARS_POR_EXCLUSAO - 1].rstrip() + "…"
        compactadas.append(texto)
        if len(compactadas) == MAX_QUESTOES_EXCLUIDAS:
            break

    if not compactadas:
        return ""
    compactadas.reverse()
    return " | ".join(f'"{pergunta}"' for pergunta in compactadas)


def criar_agente_professor() -> Agent:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY não está configurada no servidor.")

    return Agent(
        model=OpenRouter(
            id=os.getenv("OPENROUTER_MODEL", "nex-agi/nex-n2.5-pro:free"),
            api_key=api_key,
            temperature=float(os.getenv("OPENROUTER_TEMPERATURE", "0.35")),
            max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "5000")),
            timeout=float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "60")),
            max_retries=1,
            strict_output=True,
            extra_body={
                "provider": {"require_parameters": True},
                "plugins": [{"id": "response-healing"}],
                "reasoning": {"enabled": False},
            },
        ),
        output_schema=LoteQuiz,
        use_json_mode=True,
        structured_outputs=True,
        instructions=[
            "Você é um professor que elabora um quiz de revisão para universitários.",
            "Os temas recebidos são assuntos de estudo, não uma fonte a ser citada.",
            "Crie exatamente 10 questões distintas e objetivas, cada uma com quatro alternativas plausíveis.",
            "Distribua as questões pelos temas recebidos e não repita o mesmo conceito.",
            "Obedeça rigorosamente ao perfil de dificuldade informado na solicitação.",
            "Use conhecimento didático consolidado para explicar conceitos dos temas.",
            "Não mencione PUD, documento, fonte, contexto, item, subitem, numeração ou seção.",
            "Não faça perguntas sobre pré-requisito, carga horária, ementa, objetivos, metodologia, avaliação ou bibliografia.",
            "A explicação deve ensinar brevemente o conceito cobrado, sem citar a origem dos temas.",
            "Não exponha raciocínio, plano de resposta, análise ou texto introdutório.",
            "Não analise nem enumere as perguntas bloqueadas; use-as apenas como restrição silenciosa.",
            'Retorne somente JSON válido neste formato: {"disciplina":"nome da disciplina","questoes":[{"pergunta":"texto","alternativas":["A","B","C","D"],"correta":"A","explicacao":"texto"}]}.',
            "A chave questoes deve conter exatamente 10 itens e cada item deve ter exatamente quatro alternativas.",
            "Na chave correta, retorne exclusivamente uma das letras A, B, C ou D; nunca repita o texto da alternativa.",
            "A alternativa indicada em correta deve concordar com a explicação apresentada.",
        ],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/disciplinas")
def listar_disciplinas() -> list[str]:
    return sorted(item.nome for item in carregar_catalogo_puds())


def chave_do_cache(disciplina: str, nivel: str) -> str:
    return f"{CACHE_VERSION}::{normalizar(disciplina)}::{nivel}"


def carregar_cache_quiz() -> dict[str, object]:
    with CACHE_FILE_LOCK:
        try:
            conteudo = json.loads(QUIZ_CACHE_PATH.read_text(encoding="utf-8")) if QUIZ_CACHE_PATH.is_file() else {}
            return conteudo if isinstance(conteudo, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}


def salvar_lote_no_cache(chave: str, lote: LoteQuiz) -> None:
    """Mescla o lote mais recente para não perder gravações feitas por outro job."""
    with CACHE_FILE_LOCK:
        try:
            cache = json.loads(QUIZ_CACHE_PATH.read_text(encoding="utf-8")) if QUIZ_CACHE_PATH.is_file() else {}
            if not isinstance(cache, dict):
                cache = {}
        except (OSError, json.JSONDecodeError):
            cache = {}
        cache[chave] = lote.model_dump()
        QUIZ_CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def lock_da_disciplina(disciplina: str) -> Lock:
    chave = normalizar(disciplina)
    with DISCIPLINE_LOCKS_GUARD:
        return DISCIPLINE_LOCKS.setdefault(chave, Lock())


def perguntas_sao_semelhantes(primeira: str, segunda: str) -> bool:
    primeira_normalizada = normalizar(primeira)
    segunda_normalizada = normalizar(segunda)
    if primeira_normalizada == segunda_normalizada:
        return True

    palavras_ignoradas = {
        "A", "AS", "E", "EM", "DE", "DA", "DAS", "DO", "DOS", "O", "OS", "PARA",
        "POR", "QUAL", "QUAIS", "QUE", "SE", "UM", "UMA",
    }
    palavras_primeira = {
        palavra for palavra in re.findall(r"[A-Z0-9]+", primeira_normalizada)
        if palavra not in palavras_ignoradas
    }
    palavras_segunda = {
        palavra for palavra in re.findall(r"[A-Z0-9]+", segunda_normalizada)
        if palavra not in palavras_ignoradas
    }
    uniao = palavras_primeira | palavras_segunda
    sobreposicao = len(palavras_primeira & palavras_segunda) / len(uniao) if uniao else 0
    return sobreposicao >= 0.5 or SequenceMatcher(
        None, primeira_normalizada, segunda_normalizada
    ).ratio() >= 0.78


def perguntas_anteriores(cache: dict[str, object], disciplina: str) -> list[str]:
    """Coleta enunciados já usados na disciplina, inclusive caches de versões anteriores."""
    disciplina_normalizada = normalizar(disciplina)
    encontradas: list[str] = []
    for conteudo in cache.values():
        try:
            lote = LoteQuiz.model_validate(conteudo)
        except ValidationError:
            continue
        if normalizar(lote.disciplina) == disciplina_normalizada:
            encontradas.extend(questao.pergunta for questao in lote.questoes)
    return encontradas


def _gerar_quiz(pedido: GerarQuizRequest) -> LoteQuiz:
    nivel = pedido.nivel.strip().lower()
    if nivel not in PERFIS_NIVEL:
        raise HTTPException(status_code=422, detail="Nível deve ser iniciante, intermediário ou avançado.")

    topicos = limitar_contexto(localizar_topicos(pedido.disciplina))
    chave_cache = chave_do_cache(pedido.disciplina, nivel)
    cache = carregar_cache_quiz()
    try:
        if chave_cache in cache:
            return LoteQuiz.model_validate(cache[chave_cache])
    except ValidationError:
        cache.pop(chave_cache, None)

    usadas = perguntas_anteriores(cache, pedido.disciplina)
    bloco_exclusoes = ""
    exclusoes = formatar_exclusoes(usadas)
    if exclusoes:
        bloco_exclusoes = (
            "\n\n# Restrição de variedade\n\n"
            "Não repita nem parafraseie estes enunciados e não os discuta na resposta: "
            f"{exclusoes}."
        )
    prompt = (
        "# Solicitação de quiz\n\n"
        f"- **Disciplina:** {pedido.disciplina}\n"
        f"- **Nível:** {nivel}\n"
        f"- **Perfil obrigatório:** {PERFIS_NIVEL[nivel]}\n"
        f"- **Quantidade:** {TOTAL_QUESTOES} questões\n\n"
        "# Conteúdos programáticos\n\n"
        f"{topicos}"
        f"{bloco_exclusoes}"
    )

    ultimo_erro: Exception | None = None
    houve_falha_do_provedor = False
    for tentativa in range(2):
        prompt_da_tentativa = prompt
        if tentativa > 0:
            prompt_da_tentativa += (
                "\n\n# Correção obrigatória\n\n"
                "A tentativa anterior não respeitou o formato. Gere novamente do zero e devolva "
                "exclusivamente o objeto JSON completo, sem Markdown, comentários ou análise."
            )
        resposta = criar_agente_professor().run(prompt_da_tentativa)
        if resposta.status == RunStatus.error:
            logger.error("Falha do provedor de IA: %s", resposta.content)
            detalhe = (
                "O modelo de IA configurado está indisponível no OpenRouter. "
                "Confira OPENROUTER_MODEL no servidor."
                if isinstance(resposta.content, str)
                and any(
                    trecho in resposta.content.casefold()
                    for trecho in ("unavailable", "no endpoints found", "model not found")
                )
                else "O provedor de IA não conseguiu gerar o quiz. Tente novamente em instantes."
            )
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detalhe)
        if conteudo_indica_falha_do_provedor(resposta.content):
            houve_falha_do_provedor = True
            logger.warning("O provedor não retornou conteúdo na tentativa %s.", tentativa + 1)
            continue
        try:
            lote = validar_lote_do_provedor(resposta.content)
            repetidas = [
                questao.pergunta
                for questao in lote.questoes
                if any(perguntas_sao_semelhantes(questao.pergunta, anterior) for anterior in usadas)
            ]
            if repetidas:
                raise ValueError("O provedor repetiu perguntas de outro nível.")
            lote = lote.model_copy(update={"disciplina": pedido.disciplina})
            salvar_lote_no_cache(chave_cache, lote)
            return lote
        except (ValidationError, ValueError) as exc:
            ultimo_erro = exc
            tamanho = len(resposta.content) if isinstance(resposta.content, str) else None
            logger.warning(
                "Resposta inválida do provedor na tentativa %s (%s caracteres): %s",
                tentativa + 1,
                tamanho if tamanho is not None else "conteúdo estruturado",
                exc,
            )

    if ultimo_erro is None and houve_falha_do_provedor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O provedor de IA está temporariamente indisponível. Tente novamente em instantes.",
        )

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="O provedor de IA não retornou um lote de questões em formato válido. Tente novamente.",
    ) from ultimo_erro


@app.post("/api/gerar-quiz", response_model=LoteQuiz)
def gerar_quiz(pedido: GerarQuizRequest) -> LoteQuiz:
    # Requisições da mesma disciplina compartilham cache e lista de exclusão.
    # Serializá-las evita duas gerações caras e repetidas em paralelo.
    with lock_da_disciplina(pedido.disciplina):
        return _gerar_quiz(pedido)


def processar_job(job_id: str, pedido: GerarQuizRequest) -> None:
    try:
        JOBS[job_id] = {"status": "processando"}
        JOBS[job_id] = {"status": "pronto", "lote": gerar_quiz(pedido)}
    except HTTPException as exc:
        JOBS[job_id] = {"status": "erro", "erro": str(exc.detail)}
    except Exception:
        logger.exception("Falha no job de quiz")
        JOBS[job_id] = {"status": "erro", "erro": "Não foi possível gerar o quiz."}


@app.post("/api/solicitar-quiz", response_model=JobQuiz, status_code=status.HTTP_202_ACCEPTED)
def solicitar_quiz(pedido: GerarQuizRequest) -> JobQuiz:
    job_id = str(uuid4())
    JOBS[job_id] = {"status": "processando"}
    EXECUTOR.submit(processar_job, job_id, pedido)
    return JobQuiz(id=job_id, status="processando")


@app.get("/api/quiz-jobs/{job_id}", response_model=JobQuiz)
def consultar_job(job_id: str) -> JobQuiz:
    job = JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Geração de quiz não encontrada.")
    return JobQuiz(id=job_id, **job)


if __name__ == "__main__":
    import sys

    if "--indexar-puds" not in sys.argv:
        raise SystemExit("Use uvicorn main:app para iniciar a API ou python main.py --indexar-puds para preparar o catálogo.")
    catalogo_gerado = gerar_catalogo_puds()
    print(f"Catálogo preparado: {len(catalogo_gerado)} disciplinas em {CATALOGO_PUDS_PATH}")
