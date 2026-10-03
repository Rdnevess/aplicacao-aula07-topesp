# AGENTS.md — Ditado

Contexto para o agente (Claude Code) que trabalha neste repositório. **O que** construir está em `docs/ESPECIFICACAO.md`; este arquivo diz **como** trabalhar. Em conflito, a especificação vence e este arquivo é corrigido.

## Pilha

- **Backend** (`backend/`): NestJS 12 (ESM), TypeORM 1.x + PostgreSQL 17, @nestjs/config, @nestjs/jwt + passport-jwt, bcryptjs, class-validator, Vitest + Supertest.
- **Frontend** (`frontend/`): React 19 + Vite 8 + TypeScript, react-router-dom, axios, TanStack Query, Zustand, react-hook-form + zod, Tailwind CSS v4, lucide-react.
- **Banco**: `docker-compose.yml` na raiz, só o PostgreSQL, porta publicada em `127.0.0.1:5432`.
- **Serviço externo**: Groq (Whisper), chamado **só pelo backend**.

## Comandos

| O quê | Comando | Onde |
|---|---|---|
| Subir banco | `docker compose up -d` | raiz |
| Subir tudo | `./start.sh` | raiz (Git Bash/WSL) |
| Derrubar backend e frontend | `./stop.sh` | raiz |
| Backend em desenvolvimento | `npm run start:dev` | `backend/` |
| Testes unitários | `npm test` | `backend/` |
| Testes e2e (banco `ditado_test`) | `npm run test:e2e` | `backend/` |
| Build do backend | `npm run build` | `backend/` |
| Frontend em desenvolvimento | `npm run dev` | `frontend/` |
| Build + checagem de tipos do frontend | `npm run build` | `frontend/` |

## Convenções do backend

- Um módulo por domínio (`users`, `auth`, `transcriptions`, `health`), cada um com `module`, `controller`, `service` e, quando houver, `dto/` e `entities/`.
- **Controller** recebe a requisição, extrai parâmetros e chama o service. Não importa `Repository`, não decide regra de negócio.
- **Service** tem a regra de negócio e o acesso ao banco pelo repositório do TypeORM.
- **DTO** define o que pode entrar. `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted`: campo não declarado é 400.
- **Resposta** nunca é a entidade crua de `User`: sempre `toUserResponse()`. Transcrição sai por `toTranscriptionResponse()`.
- `passwordHash` tem `select: false`; quem precisa dele (login) pede explicitamente com `addSelect`.
- Consulta de transcrição **sempre** filtra por dono na própria consulta: `{ id, user: { id: currentUser.id } }`. Não encontrou → 404.
- ESM: imports relativos terminam em `.js`.
- Configuração só pelo `ConfigService`; variáveis validadas em `src/config/env.validation.ts`.

## Convenções do frontend

- Uma página por rota em `src/pages/`; o que se repete vai para `src/components/`.
- Toda chamada HTTP passa por `src/services/api.ts` (instância única do axios, `baseURL: '/api'`).
- Dados do servidor: TanStack Query. Sessão (usuário e token): Zustand em `src/store/authStore.ts`. Não misturar.
- Tipos do contrato em `src/types/`; mudam no mesmo commit que o backend.
- Sem `enum` (o tsconfig usa `erasableSyntaxOnly`); use união de strings. Tipos com `import type`.

## Nunca

- Controller com `Repository` ou regra de negócio.
- Entidade `User` devolvida diretamente, ou qualquer resposta com `passwordHash`.
- `role` (ou outro campo sensível) aceito no cadastro; `email`/`passwordHash` aceitos no `PATCH /users/:id`.
- Consulta de transcrição sem filtro por dono.
- Endereço absoluto do backend (`localhost:3000`) ou qualquer segredo no frontend. O frontend não tem `.env`.
- Ler, imprimir, copiar ou commitar `backend/.env`. A chave da Groq e o `JWT_SECRET` não aparecem em código, log nem mensagem.
- Mudar o contrato da API em um lado só.
- Publicar a porta do banco sem `127.0.0.1:` na frente.

## Ciclo de trabalho

Cada etapa de `docs/ESPECIFICACAO.md` (seção 11) segue o ciclo:

1. **Pedido** — o usuário pede a etapa.
2. **Plano** — o agente propõe o que vai fazer; o usuário corrige.
3. **Execução** — o agente cria e altera os arquivos, rodando testes e build.
4. **Verificação** — o **usuário** roda os critérios de aceite no próprio terminal e navegador. O relato do agente não substitui a saída do comando.
5. **Registro** — commit `etapa N: <nome>`, só depois da aprovação do usuário.

Não avance de etapa sem a verificação do usuário.
