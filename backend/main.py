"""API do PUD.ai para quizzes gerados a partir do catálogo textual de PUDs."""

from __future__ import annotations

import logging
import os
import re
import unicodedata
import json
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from functools import lru_cache
from pathlib import Path

from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator
from pypdf import PdfReader

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).with_name(".env"))

PDF_PUDS_PATH = Path(os.getenv("PUDS_PDF_PATH", str(Path(__file__).parent / "data" / "puds-bcc-textual.pdf")))
INDICE_PUDS_PATH = PDF_PUDS_PATH.with_suffix(".index.json")
CATALOGO_PUDS_PATH = PDF_PUDS_PATH.with_name("catalogo-puds.json")
QUIZ_CACHE_PATH = PDF_PUDS_PATH.with_name("quiz-cache.json")
TOTAL_QUESTOES = 10
EXECUTOR = ThreadPoolExecutor(max_workers=2)
JOBS: dict[str, dict] = {}


class QuizGerado(BaseModel):
    pergunta: str = Field(min_length=5)
    alternativas: list[str] = Field(min_length=4, max_length=4)
    correta: str = Field(description="Letra A, B, C ou D da alternativa correta")
    explicacao: str = Field(min_length=5)

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

    if INDICE_PUDS_PATH.is_file() and INDICE_PUDS_PATH.stat().st_mtime >= PDF_PUDS_PATH.stat().st_mtime:
        try:
            dados = json.loads(INDICE_PUDS_PATH.read_text(encoding="utf-8"))
            return tuple(PaginaPud.model_validate(item) for item in dados)
        except (OSError, json.JSONDecodeError, ValidationError):
            logger.warning("Índice de PUDs inválido; ele será recriado.")

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
        INDICE_PUDS_PATH.write_text(
            json.dumps([pagina.model_dump() for pagina in paginas], ensure_ascii=False),
            encoding="utf-8",
        )
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
    CATALOGO_PUDS_PATH.write_text(
        json.dumps([disciplina.model_dump() for disciplina in catalogo], ensure_ascii=False), encoding="utf-8"
    )
    return catalogo


@lru_cache(maxsize=1)
def carregar_catalogo_puds() -> tuple[DisciplinaCatalogo, ...]:
    if not CATALOGO_PUDS_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail="O catálogo ainda não foi preparado. Execute: python main.py --indexar-puds",
        )
    try:
        dados = json.loads(CATALOGO_PUDS_PATH.read_text(encoding="utf-8"))
        return tuple(DisciplinaCatalogo.model_validate(item) for item in dados)
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=503, detail="O catálogo de PUDs é inválido.") from exc


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
        r"\b(?:aulas?\s+(?:expositivas|dialogadas)|bibliografia|refer[eê]ncias)\b",
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
    sem_numeracao = re.sub(r"(?<!\d)\d{1,2}(?:\.\d{1,2})?\s*[.)]\s+", "", conteudos)
    return " ".join(sem_numeracao.split())


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


def criar_agente_professor() -> Agent:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY não está configurada no servidor.")

    return Agent(
        model=OpenRouter(
            id=os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
            api_key=api_key,
            temperature=0.2,
            max_tokens=3500,
        ),
        output_schema=LoteQuiz,
        use_json_mode=True,
        structured_outputs=True,
        instructions=[
            "Você é um professor que elabora um quiz de revisão para universitários.",
            "Os temas recebidos são assuntos de estudo, não uma fonte a ser citada.",
            "Crie exatamente 10 questões distintas e objetivas, cada uma com quatro alternativas plausíveis.",
            "Distribua as questões pelos temas recebidos e não repita o mesmo conceito.",
            "Use conhecimento didático consolidado para explicar conceitos dos temas.",
            "Não mencione PUD, documento, fonte, contexto, item, subitem, numeração ou seção.",
            "Não faça perguntas sobre pré-requisito, carga horária, ementa, objetivos, metodologia, avaliação ou bibliografia.",
            "A explicação deve ensinar brevemente o conceito cobrado, sem citar a origem dos temas.",
            "Não exponha raciocínio, plano de resposta, análise ou texto introdutório.",
            'Retorne somente JSON válido neste formato: {"disciplina":"nome da disciplina","questoes":[{"pergunta":"texto","alternativas":["A","B","C","D"],"correta":"A","explicacao":"texto"}]}.',
            "A chave questoes deve conter exatamente 10 itens e cada item deve ter exatamente quatro alternativas.",
        ],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/disciplinas")
def listar_disciplinas() -> list[str]:
    return sorted(item.nome for item in carregar_catalogo_puds())


@app.post("/api/gerar-quiz", response_model=LoteQuiz)
def gerar_quiz(pedido: GerarQuizRequest) -> LoteQuiz:
    niveis_permitidos = {"iniciante", "intermediário", "avançado"}
    nivel = pedido.nivel.strip().lower()
    if nivel not in niveis_permitidos:
        raise HTTPException(status_code=422, detail="Nível deve ser iniciante, intermediário ou avançado.")

    topicos = localizar_topicos(pedido.disciplina)
    chave_cache = f"{normalizar(pedido.disciplina)}::{nivel}"
    try:
        cache = json.loads(QUIZ_CACHE_PATH.read_text(encoding="utf-8")) if QUIZ_CACHE_PATH.is_file() else {}
        if chave_cache in cache:
            return LoteQuiz.model_validate(cache[chave_cache])
    except (OSError, json.JSONDecodeError, ValidationError):
        cache = {}
    prompt = (
        f"Disciplina: {pedido.disciplina}\n"
        f"Nível solicitado: {nivel}\n\n"
        f"Temas para criar as {TOTAL_QUESTOES} questões:\n{topicos}"
    )

    ultimo_erro: ValidationError | None = None
    for tentativa in range(2):
        resposta = criar_agente_professor().run(prompt)
        try:
            lote = validar_lote_do_provedor(resposta.content)
            lote = lote.model_copy(update={"disciplina": pedido.disciplina})
            cache[chave_cache] = lote.model_dump()
            QUIZ_CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
            return lote
        except ValidationError as exc:
            ultimo_erro = exc
            logger.warning("Resposta inválida do provedor na tentativa %s: %r", tentativa + 1, resposta.content)

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="O provedor de IA não retornou um lote de questões em formato válido. Tente novamente.",
    ) from ultimo_erro


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
