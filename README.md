# Ditado

Aplicação web de transcrição de áudio: o visitante cria uma conta, envia um arquivo de áudio em português e recebe o texto transcrito, que fica salvo num histórico pessoal. Um administrador gerencia as contas.

Projeto do laboratório da Aula 07 de *Tópicos Especiais em Programação* (Sistemas de Informação, UNEMAT Sinop). A especificação completa está em [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md); a forma de trabalhar com o agente, em [`AGENTS.md`](AGENTS.md).

## Pilha

- **Frontend:** React 19 + Vite + TypeScript, react-router-dom, axios, TanStack Query, Zustand, react-hook-form + zod, Tailwind CSS v4, lucide-react
- **Backend:** NestJS 12, TypeORM, PostgreSQL 17 (Docker), JWT (passport-jwt), bcryptjs, class-validator
- **Transcrição:** Whisper na API da Groq, chamado só pelo backend

## Pré-requisitos

- Node.js 22.12 ou superior e npm
- Docker com Docker Compose (no Windows, o Docker Desktop aberto)
- Git Bash ou WSL para os scripts `start.sh`/`stop.sh` (opcional: dá para rodar pelo PowerShell, veja abaixo)
- Uma chave da Groq (`gsk_…`), criada em https://console.groq.com → API Keys

## Rodar do zero

```bash
git clone <url-do-repositório> ditado
cd ditado
cp backend/.env.example backend/.env
```

Edite `backend/.env` e preencha:

| Variável | O que pôr |
|---|---|
| `JWT_SECRET` | um segredo longo e aleatório: `openssl rand -hex 32` |
| `GROQ_API_KEY` | a sua chave da Groq |
| `ADMIN_PASSWORD` | a senha do administrador criado na primeira inicialização (8+ caracteres) |

Os demais valores já servem para desenvolvimento. O administrador entra com `ADMIN_EMAIL` (padrão `admin@ditado.dev`) e `ADMIN_PASSWORD`.

### Git Bash ou WSL

```bash
./start.sh     # instala dependências na primeira vez, sobe o banco, o backend e o frontend
./stop.sh      # derruba backend e frontend (o banco continua; docker compose down para parar)
```

Logs em `logs/backend.log` e `logs/frontend.log`.

### PowerShell

```powershell
docker compose up -d
# terminal 1
cd backend; npm install; npm run start:dev
# terminal 2
cd frontend; npm install; npm run dev
```

### Endereços

- Aplicação: http://localhost:5173
- API: http://localhost:3000/api/health
- Banco: `127.0.0.1:5433` (usuário, senha e banco `ditado`)

O contêiner do banco é publicado na porta **5433** do computador, e não na 5432, porque a máquina de desenvolvimento já tinha um PostgreSQL instalado como serviço do Windows ocupando a 5432. Por isso o `backend/.env.example` traz `DB_PORT=5433`.

## Testes

```bash
cd backend
npm test            # unitários (validação do .env, cliente da Groq)
npm run test:e2e    # e2e contra o banco ditado_test (criado automaticamente); a Groq é simulada
cd ../frontend
npm run build       # checagem de tipos + build
```

Os testes e2e precisam do banco no ar (`docker compose up -d`) e do `backend/.env` preenchido.

## Declaração de uso de IA

| Ferramenta | Modelo | Onde foi usada |
|---|---|---|
| Claude Code (CLI) | Claude Opus 5.5 | Brainstorming e revisão da especificação (`docs/ESPECIFICACAO.md`), redação do `AGENTS.md` e do plano de implementação, e geração do código de todas as etapas (0 a 5): backend, frontend, testes, scripts e este README. |

Cada etapa seguiu o ciclo pedido → plano → execução → verificação → commit, com os critérios de aceite da seção 11 da especificação. Nesta versão, a pedido do grupo, a execução foi contínua: o próprio Claude Code rodou os critérios (testes automatizados, `curl` e navegador via Playwright) antes de cada commit e revisou o código com o checklist da seção 12. **O grupo deve repetir a verificação no próprio terminal antes da entrega**, porque o relato do agente não substitui a saída do comando.
