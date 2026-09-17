# PUD.AI

**Seu estudo universitário, gamificado.** Aplicativo em Expo/React Native para revisar conteúdos programáticos dos PUDs do Bacharelado em Ciência da Computação do IFCE Aracati. O backend em FastAPI usa um modelo do OpenRouter para gerar quizzes; Firebase Authentication e Cloud Firestore guardam contas, disciplinas e progresso.

Projeto da disciplina de **Desenvolvimento Mobile — IFCE, Campus Aracati**.

## O que o app oferece

- Cadastro e login por e-mail e senha; login com Google é opcional.
- Disciplinas sugeridas a partir do catálogo dos PUDs.
- Quizzes com 10 questões nos níveis iniciante, intermediário e avançado.
- Resultado com explicações, XP, progresso por disciplina, perfil e ranking.

As questões são geradas por IA a partir dos temas dos PUDs. Elas podem conter erros e devem ser revisadas antes de uso como material oficial de estudo.

## Requisitos para rodar localmente

- Git.
- Node.js **22.13 ou superior**, requisito do Expo SDK 57.
- Python **3.12** com `py` disponível no PowerShell (ou ajuste os comandos para sua instalação).
- Expo Go atualizado no celular, com celular e computador na mesma rede Wi-Fi. Também é possível usar um emulador ou abrir a versão web.
- A configuração Web do projeto Firebase oficial do PUD.AI, fornecida pelo responsável, e uma conta própria no [OpenRouter](https://openrouter.ai/) para criar a chave da API.

Os comandos abaixo são para **PowerShell no Windows**. Mantenha dois terminais abertos: um para a API e outro para o Expo.

## 1. Obter o projeto

```powershell
git clone https://github.com/hiurysousa/pud.ai.git
cd pud.ai
npm ci
```

O catálogo `backend/data/catalogo-puds.md` precisa estar na cópia do projeto. Ele contém os tópicos das disciplinas e já permite rodar a API **sem o PDF original**. Se esse arquivo não estiver presente no clone, peça a versão atual do projeto ao autor antes de iniciar a API. O PDF não é versionado; a [página oficial de PUDs do IFCE Aracati](https://acervo.ifce.edu.br/aracati/menu/cursos-em-aracati/superiores/ciencia-da-computacao/pdfs) pode ser usada para regenerar o catálogo, conforme [instruções do backend](backend/README.md).

## 2. Configurar o Firebase

1. Peça ao responsável pelos seis valores da configuração Web do projeto Firebase oficial do PUD.AI: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` e `appId`. Para rodar o app, você não precisa criar outro projeto Firebase nem acessar o Gmail oficial. A [configuração Web contém identificadores não secretos](https://firebase.google.com/docs/web/learn-more#config-object); não peça chave JSON de administrador.
2. Se o PUD.AI já usa um projeto Firebase, reutilize esse mesmo projeto, mesmo que ele esteja vinculado a outra conta Google. A conta Gmail oficial pode receber acesso a ele em **Usuários e permissões**. Crie um projeto novo nessa conta somente se ainda não houver um Firebase para o PUD.AI; nesse caso, registre um **aplicativo Web**. Os valores ficam em **Configurações do projeto → Geral → Seus apps → aplicativo Web → Configuração do SDK → Configuração** no [Firebase Console](https://console.firebase.google.com/).
3. O responsável deve conferir se **Authentication → Sign-in method → Email/Password** está habilitado, se o **Firestore Database** `(default)` existe e se o conteúdo de [firestore.rules](firestore.rules) foi publicado em **Rules**. Sem isso, o app não consegue cadastrar usuários ou salvar progresso e ranking.
4. Na raiz do projeto, copie `.env.example` para `.env` e preencha os valores recebidos:

```powershell
Copy-Item .env.example .env
```

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=valor_de_apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=valor_de_authDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=valor_de_projectId
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=valor_de_storageBucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=valor_de_messagingSenderId
EXPO_PUBLIC_FIREBASE_APP_ID=valor_de_appId
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8000
```

O login com Google é **opcional**. Para testá-lo, habilite Google em Authentication, configure o cliente OAuth da plataforma e preencha `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Para o primeiro teste, deixe esse campo vazio e use e-mail/senha.

Crie sua própria conta de usuário no app. Usando o Firebase oficial, contas, progresso e ranking ficam no mesmo projeto dos demais usuários. A senha do Gmail oficial não deve ser compartilhada. Se alguém precisar administrar o Firebase, o responsável pode [convidar a conta Google dessa pessoa](https://firebase.google.com/docs/projects/iam/roles) em **Configurações do projeto → Usuários e permissões**, com apenas a permissão necessária.

## 3. Criar a chave do OpenRouter

1. Crie uma conta no [OpenRouter](https://openrouter.ai/) e acesse [API Keys](https://openrouter.ai/settings/keys).
2. Crie uma chave para este projeto e copie-a. O modelo padrão `nex-agi/nex-n2.5-pro:free` é gratuito enquanto o provedor o mantiver disponível, mas possui limites de uso; **não é necessário adicionar créditos para começar com ele**.
3. Copie `backend/.env.example` para `backend/.env` e substitua apenas o valor de `OPENROUTER_API_KEY`. O arquivo `backend/.env` é local e não deve ser enviado ao Git.

```powershell
Copy-Item backend/.env.example backend/.env
```

A chave do OpenRouter fica **somente no backend**. Nunca a coloque em uma variável `EXPO_PUBLIC_*`, pois essas variáveis são incluídas no aplicativo.

## 4. Iniciar a API

Abra um PowerShell na pasta do projeto:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Deixe esse terminal aberto. Em outro terminal, teste `http://127.0.0.1:8000/health`; a resposta deve ser `{"status":"ok"}`. A lista de disciplinas fica em `http://127.0.0.1:8000/api/disciplinas`. O `0.0.0.0` é apenas o endereço de escuta do servidor, **não** o endereço a usar no app.

## 5. Conectar e abrir o app

No computador, execute `ipconfig` e encontre o endereço **IPv4** da rede Wi-Fi em uso, por exemplo `192.168.1.50`. Edite `EXPO_PUBLIC_API_URL` no `.env` da raiz para `http://192.168.1.50:8000`. No navegador do celular, confirme que `http://192.168.1.50:8000/health` abre. Se não abrir, verifique se os dois dispositivos estão na mesma rede e se o Firewall do Windows permite conexões privadas para Python na porta 8000.

Em um **segundo** PowerShell na raiz do projeto:

```powershell
npx expo start -c
```

Escaneie o QR code com o Expo Go. Crie uma conta com e-mail e senha no app, adicione uma disciplina sugerida e solicite um quiz. Para abrir no navegador do computador, use `npm run web`.

Se o Expo Go não encontrar o servidor de desenvolvimento, o Expo oferece `npx expo start --tunnel`. Esse túnel conecta o **Expo**; a API continua precisando ser acessível no endereço definido em `EXPO_PUBLIC_API_URL`.

## Problemas comuns

- **Firebase não configurado:** confira os seis campos `EXPO_PUBLIC_FIREBASE_*` do aplicativo Web e reinicie o Expo com `npx expo start -c`.
- **Falha ao salvar progresso:** peça ao responsável para conferir o Firestore `(default)`, a publicação de [firestore.rules](firestore.rules) e a opção Email/Password no projeto oficial.
- **O celular não acessa a API:** use o IPv4 do computador em `EXPO_PUBLIC_API_URL`, teste `/health` no celular e confira rede e firewall. `localhost` aponta para o próprio celular.
- **A lista de disciplinas falha:** confirme que `backend/data/catalogo-puds.md` existe e que `/api/disciplinas` responde.
- **O quiz falha ou demora:** os pedidos são processados em segundo plano; várias consultas `GET /api/quiz-jobs/{id}` com HTTP 200 são normais enquanto o job está em andamento. Confira a mensagem de erro exibida no app e o terminal da API. Modelos gratuitos podem ficar indisponíveis ou atingir limite de uso. Veja [OpenRouter Models](https://openrouter.ai/models) antes de alterar `OPENROUTER_MODEL` em `backend/.env`; o modelo escolhido precisa aceitar saída estruturada. Reinicie a API após alterar o arquivo.

## Desenvolvimento

O frontend está em `src/`, a API em `backend/main.py` e os testes do backend em `backend/test_main.py`. Para rodar os testes no PowerShell:

```powershell
.\backend\.venv\Scripts\python.exe -m unittest backend.test_main
```

Os arquivos `.env`, `backend/.env`, o PDF de origem e o cache de quizzes são locais. O catálogo Markdown é o dado de leitura necessário para uma instalação nova.

## Equipe

- José Guilherme Lima de Carvalho
- Marcio Hiury de Sousa Barbosa

## Fontes de configuração

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Firebase: registrar app Web](https://firebase.google.com/docs/web/setup), [habilitar Email/Password](https://firebase.google.com/docs/auth/web/password-auth) e [gerenciar regras do Firestore](https://firebase.google.com/docs/firestore/using-console)
- [OpenRouter: criar chave e consultar modelos](https://openrouter.ai/docs/quickstart)
