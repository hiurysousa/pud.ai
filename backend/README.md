# Backend do PUD.ai

API FastAPI que recebe um PUD em PDF e retorna uma questão de múltipla escolha.

## Configuração

No diretório `backend`, crie um ambiente virtual e instale as dependências:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Preencha `OPENROUTER_API_KEY` em `.env`. Esse arquivo está no `.gitignore`; use
`.env.example` como referência para ambientes novos.

Inicie a API a partir da pasta `backend`:

```powershell
uvicorn main:app --reload --port 8000
```

A documentação interativa ficará em `http://127.0.0.1:8000/docs`.

## Requisição do Expo

`POST /api/gerar-quiz` como `multipart/form-data`:

- `arquivo`: PDF do PUD;
- `nivel`: `iniciante`, `intermediário` ou `avançado`.

Resposta:

```json
{
  "pergunta": "...",
  "alternativas": ["...", "...", "...", "..."],
  "correta": "B",
  "explicacao": "..."
}
```

## Como o contexto é usado

O `PDFReader` do Agno extrai o texto do PDF enviado. O backend mantém o arquivo
somente em um arquivo temporário, entrega o conteúdo como contexto da chamada e
o remove imediatamente após a resposta. O agente recebe instruções para usar
essa fonte como única referência e o `output_schema` valida o JSON antes de ele
chegar ao React Native.

Para PDFs digitalizados como imagem, será necessário OCR antes da extração.
