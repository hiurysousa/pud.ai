# Backend do PUD.ai

API FastAPI que gera quizzes a partir do catálogo Markdown dos PUDs.

## Configuração

No diretório `backend`, crie um ambiente virtual e instale as dependências:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crie uma conta e uma chave em [OpenRouter API Keys](https://openrouter.ai/settings/keys).
Copie `.env.example` para `.env` e preencha `OPENROUTER_API_KEY`. O arquivo `.env`
é local e não deve ser enviado ao Git.

Por padrão, o backend usa `openrouter/free`, o roteador gratuito do OpenRouter. Ele
seleciona a cada chamada um modelo gratuito compatível com os recursos exigidos,
inclusive modo JSON, evitando depender de um único modelo temporário. A configuração
não força nem bloqueia o modo de raciocínio, pois alguns modelos do roteador o exigem.
O resultado é validado localmente contra o esquema completo antes de entrar no cache
ou chegar ao app. Se um endpoint gratuito estiver momentaneamente incompatível, a API
tenta outra rota do mesmo roteador antes de devolver erro. O limite e o tempo máximo podem ser ajustados com
`OPENROUTER_MAX_TOKENS` e `OPENROUTER_TIMEOUT_SECONDS`. Após alterar
`OPENROUTER_MODEL` em `.env`, reinicie o servidor.

O arquivo `data/catalogo-puds.md` acompanha o projeto e já contém as disciplinas
necessárias para rodar a API. O PDF original é opcional. Para atualizar o catálogo,
baixe o [PUD do Bacharelado em Ciência da Computação do IFCE Aracati](https://acervo.ifce.edu.br/aracati/menu/cursos-em-aracati/superiores/ciencia-da-computacao/pdfs),
salve o PDF textual como `data/puds-bcc-textual.pdf` e execute:

```powershell
python main.py --indexar-puds
```

O comando lê `data/puds-bcc-textual.pdf` e gera `data/catalogo-puds.md`, com uma
seção por disciplina e os conteúdos programáticos organizados em títulos e listas.
O JSON mantido em `data/quiz-cache.json` é apenas um cache das respostas prontas e não é
injetado no modelo. O cache é separado por disciplina e nível. Entradas antigas que
não contenham quatro alternativas completas são descartadas automaticamente. Ao gerar
um nível novo, os enunciados já usados nos outros níveis da mesma disciplina entram
numa lista de exclusão para evitar questões repetidas ou apenas parafraseadas.

Inicie a API a partir da pasta `backend`:

```powershell
uvicorn main:app --reload --port 8000
```

A documentação interativa ficará em `http://127.0.0.1:8000/docs`.

## Requisição do Expo

O app inicia a geração em `POST /api/solicitar-quiz`, enviando JSON:

```json
{
  "disciplina": "Estrutura de Dados",
  "nivel": "iniciante"
}
```

A API responde com um identificador de job. O app consulta
`GET /api/quiz-jobs/{id}` até receber o lote de 10 questões.

Os níveis usam perfis diferentes: iniciante prioriza fundamentos, intermediário exige
aplicação e comparação, e avançado trabalha análise, decisões e casos complexos. O
contexto enviado ao provedor é limitado para reduzir latência sem cortar tópicos no
meio de uma linha.

## Como o contexto é usado

O `PyPDF` extrai os conteúdos programáticos do PDF durante a indexação. O
backend salva esse catálogo em Markdown e injeta somente a seção da disciplina
solicitada. O `output_schema` valida o lote retornado antes de ele chegar ao
React Native.

Para PDFs digitalizados como imagem, será necessário OCR antes da extração.
