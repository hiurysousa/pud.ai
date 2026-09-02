# PUD.AI

**Seu estudo universitário, gamificado.**

PUD.AI é um aplicativo mobile que transforma o Plano Único de Disciplina (PUD) de cada matéria em quizzes automáticos gerados por Inteligência Artificial, com feedback imediato e gamificação (XP, níveis, conquistas e ranking) para engajar o estudante em sessões curtas de revisão — pensadas para "tempos mortos" da rotina universitária, como o transporte público.

Projeto desenvolvido para a disciplina de **Desenvolvimento Mobile — IFCE, Campus Aracati**.

## Equipe

- José Guilherme Lima de Carvalho
- Marcio Hiury de Sousa Barbosa

## Sobre o projeto

A proposta nasce de um problema comum entre estudantes de cursos como Ciência da Computação e Engenharia: pouco tempo livre e dificuldade de manter a base teórica das disciplinas em dia. O PUD.AI resolve isso ancorando toda a geração de conteúdo (quizzes, explicações) estritamente ao PUD oficial de cada disciplina, evitando alucinações da IA e garantindo fidelidade ao que é cobrado em sala.

### Principais funcionalidades (MVP)

- **Autenticação** — login por e-mail/senha, com suporte planejado a SSO (Google/Apple)
- **Gerenciamento de disciplinas** — cadastro das matérias do semestre e acompanhamento de progresso
- **Ingestão de PUDs** — leitura dos Planos Únicos de Disciplina para dar contexto à IA
- **Geração automática de quizzes** — questões de múltipla escolha ancoradas na ementa
- **Correção e feedback com IA** — resposta corrigida na hora, com justificativa baseada no PUD

### Funcionalidades de engajamento

- Sistema de gamificação com ranking semanal/geral
- Perfil com XP, níveis e conquistas (badges)
- Painel de desempenho (Analytics) com percentual de acertos por disciplina

Para o detalhamento completo dos requisitos funcionais e não-funcionais, com priorização MoSCoW, veja a documentação de Engenharia de Requisitos do projeto.

## Telas do protótipo

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Splash Screen | Abertura com identidade visual; toque no logo leva ao login |
| 2 | Login | Autenticação com e-mail/senha + SSO |
| 3 | Dashboard (Home) | Visão geral, progresso e CTA para continuar estudando |
| 4 | Disciplinas | Listagem das matérias do semestre com progresso |
| 5–6 | Quiz | Pergunta objetiva com feedback visual de acerto/erro |
| 7 | Analytics | Desempenho detalhado por disciplina |
| 8 | Perfil | Nível, XP e conquistas desbloqueadas |
| 9 | Ranking | Leaderboard semanal/geral entre estudantes |

## Tecnologias

- [Expo](https://expo.dev/) / React Native
- [Expo Router](https://docs.expo.dev/router/introduction/) (navegação por arquivos)
- TypeScript
- `@expo/vector-icons`

## Estrutura de pastas

```
pud-ai/
├── src/
│   ├── app/                  # rotas (Expo Router)
│   │   ├── _layout.tsx       # stack raiz
│   │   ├── index.tsx         # Splash
│   │   ├── login.tsx         # Login
│   │   └── (tabs)/           # navegação principal pós-login
│   │       ├── _layout.tsx
│   │       ├── index.tsx     # Home / Dashboard
│   │       ├── disciplinas.tsx
│   │       ├── ranking.tsx
│   │       └── perfil.tsx
│   ├── screens/               # componentes de tela
│   │   ├── SplashScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   └── constants/
│       └── colors.ts          # paleta de cores do app
├── app.json
├── package.json
└── README.md
```

## Como rodar o projeto

Pré-requisitos: [Node.js](https://nodejs.org/) instalado e o app **Expo Go** no celular (ou um emulador Android/iOS configurado).

```bash
# instalar dependências
npm install

# iniciar o projeto (limpando o cache)
npx expo start -c
```

Escaneie o QR code exibido no terminal com o app Expo Go (Android) ou a câmera (iOS) para abrir o app no celular.

## Status atual

- [x] Splash Screen
- [x] Login
- [x] Dashboard (Home)
- [ ] Disciplinas
- [ ] Quiz (pergunta e resultado)
- [ ] Analytics
- [ ] Perfil
- [ ] Ranking
- [ ] Integração real com IA para geração de quizzes