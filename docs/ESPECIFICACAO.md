# Ditado — Especificação

Aplicação web de transcrição de áudio. O visitante conhece o produto numa landing page, cria uma conta e, na área interna, envia um arquivo de áudio e recebe o texto transcrito. As transcrições ficam salvas num histórico pessoal. Um usuário administrador gerencia as contas.

Este documento é a fonte da verdade do projeto: o código é gerado a partir dele e, quando o produto mudar, ele muda primeiro. A forma de trabalhar (convenções, comandos, proibições) está em `AGENTS.md`.

---

## 1. Escopo

### 1.1 O que a aplicação faz

- Landing page pública que apresenta o produto.
- Cadastro e login com e-mail e senha; sessão por token JWT.
- Envio de **arquivo** de áudio (mp3, m4a, wav, ogg, webm, flac, mp4, mpeg; até 25 MB) e transcrição em português pelo Whisper da Groq.
- Histórico pessoal: listar, ver o detalhe, copiar o texto e excluir transcrições.
- Administração: listar usuários, mudar o papel (`user` ↔ `admin`) e ativar/desativar contas.

### 1.2 O que a aplicação não faz

- Gravação pelo microfone do navegador.
- Edição de transcrições, títulos, busca ou download em arquivo.
- Exclusão de contas; acesso do admin às transcrições de outros usuários.
- Escolha de idioma: a transcrição é sempre em `pt`.
- Armazenamento do áudio: o arquivo fica só em memória durante a requisição.
- Recuperação de senha, confirmação de e-mail, paginação.

---

## 2. Arquitetura

Três camadas e um serviço externo, todos na máquina do desenvolvedor nesta fase:

| Camada | Programa | Porta | Responsabilidade |
|---|---|---|---|
| Interface | React, executado no navegador, servido pelo Vite | 5173 | Telas e coleta do que o usuário informa |
| API | NestJS | 3000 | Regras, autenticação, acesso ao banco, chamada à Groq |
| Dados | PostgreSQL 17 em contêiner | 5433 no computador → 5432 no contêiner (só `127.0.0.1`) | Usuários e transcrições |
| Serviço externo | Groq (Whisper) | — | Transcrever o áudio |

Regras de arquitetura:

- O frontend chama **apenas** o caminho relativo `/api`; o proxy do Vite repassa para `http://localhost:3000`. Nenhum endereço absoluto no frontend.
- O frontend não tem segredo nem arquivo `.env`. Toda credencial fica no backend.
- O CORS fica desligado no backend: com o proxy, frontend e API são a mesma origem.
- O esquema do banco é criado pelo TypeORM com `synchronize: true` (apenas desenvolvimento).

### 2.1 Pilha

**Frontend:** React, Vite, TypeScript, react-router-dom, axios, TanStack Query, Zustand, react-hook-form + zod, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react.

**Backend:** NestJS, @nestjs/config, TypeORM + @nestjs/typeorm + pg, @nestjs/jwt + @nestjs/passport + passport-jwt, bcryptjs, class-validator + class-transformer, multer (via @nestjs/platform-express). Chamada à Groq com `fetch` e `FormData` nativos do Node (sem SDK).

**Testes:** Vitest + Supertest (e2e do backend) — o runner que o scaffold do NestJS 12 já traz. O backend do NestJS 12 é ESM: imports relativos levam a extensão `.js`.

**Ambiente:** Node ≥ 22.12, Docker Compose, Git Bash (para `start.sh`/`stop.sh`) ou PowerShell (dois terminais).

---

## 3. Modelo de dados

### 3.1 `User` (tabela `users`)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid | chave primária, gerada |
| `name` | varchar(100) | obrigatório |
| `email` | varchar | único, gravado em minúsculas |
| `passwordHash` | varchar | hash bcrypt; `select: false` na entidade |
| `role` | enum `user` \| `admin` | padrão `user` |
| `active` | boolean | padrão `true` |
| `createdAt` | timestamp | gerado |
| `updatedAt` | timestamp | gerado |

### 3.2 `Transcription` (tabela `transcriptions`)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid | chave primária, gerada |
| `user` | FK → `users.id` | obrigatório; `onDelete: CASCADE` |
| `originalFilename` | varchar | nome do arquivo enviado |
| `mimeType` | varchar | mimetype recebido |
| `sizeBytes` | int | tamanho do arquivo |
| `durationSeconds` | float, nulo | duração informada pela Groq |
| `language` | varchar | sempre `pt` |
| `model` | varchar | valor de `GROQ_MODEL` usado |
| `text` | text | texto transcrito |
| `createdAt` | timestamp | gerado |

Um usuário tem muitas transcrições; cada transcrição pertence a exatamente um usuário.

---

## 4. Contrato da API

Prefixo global `/api`. Corpo em JSON, exceto o envio de áudio (`multipart/form-data`). Rotas protegidas exigem `Authorization: Bearer <token>`.

### 4.1 Formatos de resposta

**`UserResponse`** — a única forma em que um usuário sai da API:

```json
{ "id": "uuid", "name": "Ana", "email": "ana@teste.dev", "role": "user", "active": true, "createdAt": "2026-10-02T12:00:00.000Z" }
```

Nunca contém `passwordHash`. Montada por uma função `toUserResponse()`; a entidade `User` nunca é devolvida diretamente.

**`AuthResponse`**:

```json
{ "user": UserResponse, "accessToken": "eyJ..." }
```

**`TranscriptionResponse`**:

```json
{ "id": "uuid", "originalFilename": "teste.m4a", "mimeType": "audio/mp4", "sizeBytes": 482113, "durationSeconds": 31.4, "language": "pt", "model": "whisper-large-v3-turbo", "text": "...", "createdAt": "2026-10-02T12:00:00.000Z" }
```

Não contém dados do usuário dono.

**Erros** seguem o formato padrão do NestJS: `{ "statusCode": 400, "message": "..." | ["..."], "error": "Bad Request" }`.

### 4.2 Rotas

| Método e rota | Acesso | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `GET /api/health` | público | — | 200 `{ "status": "ok", "db": "up" }` | — |
| `POST /api/auth/register` | público | `{ name, email, password }` | 201 `AuthResponse` | 400 corpo inválido ou campo extra (ex.: `role`) · 409 e-mail já cadastrado |
| `POST /api/auth/login` | público | `{ email, password }` | 200 `AuthResponse` | 400 corpo inválido · 401 credenciais inválidas (mesma mensagem para e-mail inexistente e senha errada) · 403 conta desativada |
| `GET /api/auth/me` | logado | — | 200 `UserResponse` | 401 |
| `GET /api/transcriptions` | logado | — | 200 `TranscriptionResponse[]` das **próprias**, por `createdAt` decrescente | 401 |
| `POST /api/transcriptions` | logado | multipart, campo `file` | 201 `TranscriptionResponse` | 400 sem arquivo ou tipo não aceito · 401 · 413 acima de 25 MB · 502 falha na Groq |
| `GET /api/transcriptions/:id` | logado | — | 200 `TranscriptionResponse` | 400 `id` não é uuid · 401 · 404 inexistente ou de outro usuário |
| `DELETE /api/transcriptions/:id` | logado | — | 204 sem corpo | 400 · 401 · 404 inexistente ou de outro usuário |
| `GET /api/users` | admin | — | 200 `UserResponse[]` por `createdAt` crescente | 401 · 403 |
| `PATCH /api/users/:id` | admin | `{ role?, active? }` (ao menos um) | 200 `UserResponse` | 400 corpo inválido, `id` não é uuid ou alvo é o próprio admin · 401 · 403 · 404 |

### 4.3 Validação dos corpos (DTOs)

`ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`: qualquer campo não declarado no DTO resulta em 400.

| DTO | Campo | Regras |
|---|---|---|
| `RegisterDto` | `name` | string, aparada, 2 a 100 caracteres |
| | `email` | e-mail válido, convertido para minúsculas e aparado |
| | `password` | string, 8 a 72 caracteres |
| `LoginDto` | `email` | e-mail válido, convertido para minúsculas e aparado |
| | `password` | string não vazia |
| `UpdateUserDto` | `role` | opcional, `user` ou `admin` |
| | `active` | opcional, boolean |
| | — | ao menos um dos dois presente |

### 4.4 Envio de áudio

- `FileInterceptor('file')` com `memoryStorage` e `limits.fileSize = 25 * 1024 * 1024`; acima disso, 413.
- Mimetypes aceitos: `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/x-m4a`, `audio/m4a`, `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/ogg`, `audio/webm`, `audio/flac`, `audio/x-flac`, `video/mp4`, `video/webm`, `video/mpeg`. Fora da lista ou sem arquivo: 400.
- O campo `language` do multipart, se enviado, é ignorado.

---

## 5. Autenticação e autorização

- Senhas: hash com bcryptjs (custo 10). A senha em texto nunca é gravada nem registrada em log.
- Login: busca o usuário por e-mail (incluindo `passwordHash` explicitamente), compara com `bcrypt.compare`. Credencial errada → 401 com mensagem única (`"E-mail ou senha inválidos"`). Credencial certa e `active = false` → 403 (`"Conta desativada"`).
- Token: JWT assinado com `JWT_SECRET`, payload `{ sub: user.id }`, validade `JWT_EXPIRES_IN`.
- Guarda JWT (passport-jwt): valida assinatura e validade e então busca o usuário pelo `sub`. Usuário inexistente ou desativado → 401. O usuário carregado do banco fica em `req.user`, acessível por `@CurrentUser()`.
  - **Decisão:** a guarda consulta o banco a cada requisição, para que desativar uma conta ou mudar o papel tenha efeito imediato, e não só quando o token expirar.
- Papéis: `@Roles('admin')` + `RolesGuard`, que confere o `role` **do usuário carregado do banco**, não do token.
- Admin não pode alterar o próprio papel nem o próprio status (400), para que o sistema nunca fique sem administrador.
- **Seed:** na inicialização (`OnApplicationBootstrap`), se não existir usuário com `ADMIN_EMAIL`, é criado um com `ADMIN_NAME`, `ADMIN_PASSWORD` e papel `admin`. Se já existir, nada é alterado.

### 5.1 Controle de acesso por dono

Toda consulta de transcrição no serviço filtra por dono na própria consulta: `{ id, user: { id: currentUser.id } }`. Não existe "buscar pelo id e depois conferir o dono". Transcrição não encontrada por esse filtro → 404, tanto para inexistente quanto para alheia.

---

## 6. Integração com a Groq

- Classe isolada `backend/src/transcriptions/groq.client.ts` (`GroqClient`), injetável, para poder ser substituída por mock nos testes.
- `POST https://api.groq.com/openai/v1/audio/transcriptions` com `FormData`: `file` (bytes e nome original), `model = GROQ_MODEL`, `language = pt`, `response_format = verbose_json`.
- Cabeçalho `Authorization: Bearer ${GROQ_API_KEY}`, lido pelo `ConfigService`.
- Timeout de 60 s (`AbortSignal.timeout`).
- Da resposta, usa `text` e `duration`.
- Erro de rede, timeout ou status não-2xx → `BadGatewayException` (502) com mensagem genérica (`"Falha no serviço de transcrição"`). O log registra o status e o corpo do erro da Groq; **nunca** a chave.

---

## 7. Configuração

`backend/.env.example` (versionado) — `backend/.env` (não versionado) tem os mesmos nomes com os valores reais:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USER=ditado
DB_PASSWORD=ditado
DB_NAME=ditado
JWT_SECRET=           # gerar com: openssl rand -hex 32
JWT_EXPIRES_IN=1d
GROQ_API_KEY=         # gsk_...
GROQ_MODEL=whisper-large-v3-turbo
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@ditado.dev
ADMIN_PASSWORD=       # mínimo 8 caracteres
```

Validação na inicialização (class-validator sobre as variáveis): `JWT_SECRET`, `GROQ_API_KEY` e `ADMIN_PASSWORD` obrigatórios e não vazios; `ADMIN_PASSWORD` com 8 caracteres ou mais; portas numéricas. Faltando algo, o backend não sobe e a mensagem nomeia a variável.

**Porta do banco:** a máquina de desenvolvimento já tem um PostgreSQL instalado como serviço do Windows ocupando a 5432 (o caso de `port is already allocated` da seção 4.3 da aula). Em vez de parar esse serviço, o contêiner é publicado na porta **5433** do computador (`127.0.0.1:5433:5432`), e o backend usa `DB_PORT=5433`. Dentro do contêiner o PostgreSQL continua na 5432.

`docker-compose.yml` na raiz (só o banco):

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ditado
      POSTGRES_PASSWORD: ditado
      POSTGRES_DB: ditado
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - dados:/var/lib/postgresql/data
volumes:
  dados:
```

---

## 8. Telas (frontend)

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Landing: o que o Ditado faz, como funciona em 3 passos, chamada para criar conta. Logado, o botão principal vira "Ir para o app". |
| `/entrar` | só deslogado (logado → `/app`) | Formulário de e-mail e senha; erro do backend exibido no formulário. Link para cadastro. |
| `/cadastro` | só deslogado (logado → `/app`) | Nome, e-mail, senha e confirmação (validação zod). Sucesso: sessão iniciada e redireciona para `/app`. |
| `/app` | logado | Área de envio (arrastar ou escolher arquivo; validação de tipo e tamanho no cliente antes de enviar); estado "Transcrevendo…" com botão desabilitado; resultado com botão copiar. Abaixo, histórico: nome do arquivo, data, duração e prévia do texto; cada item leva ao detalhe. Estado vazio quando não há transcrições. |
| `/app/transcricoes/:id` | logado | Texto completo, metadados, botões copiar e excluir (com confirmação). Após excluir, volta para `/app`. 404 → mensagem "Transcrição não encontrada". |
| `/app/admin` | admin (não admin → `/app`) | Tabela de usuários: nome, e-mail, papel, status, data. Ações promover/rebaixar e ativar/desativar; desabilitadas na linha do próprio admin. |
| `*` | — | Página 404 com link para `/`. |

### 8.1 Estrutura e estado

- `services/api.ts`: instância única do axios com `baseURL: '/api'`. Interceptador de requisição acrescenta `Authorization: Bearer <token>` quando há sessão. Interceptador de resposta, em 401, limpa o `authStore` e navega para `/entrar` (exceto na própria chamada de login, cujo 401 é exibido no formulário).
- `store/authStore.ts`: Zustand com `persist` (localStorage), guarda `user` e `accessToken`; ações `setSession` e `clearSession`. Ao abrir o app com token salvo, `GET /auth/me` confirma e atualiza o usuário.
- TanStack Query: chaves `['transcriptions']`, `['transcription', id]`, `['users']`. Envio e exclusão de transcrição invalidam `['transcriptions']`; `PATCH` de usuário invalida `['users']`.
- `ProtectedRoute` (exige sessão) e `AdminRoute` (exige `role === 'admin'`). Essa proteção é conforto de interface; a autorização real é do backend.
- `types/`: `User`, `AuthResponse`, `Transcription` — espelham a seção 4.1.
- `components/layout/`: layout interno com cabeçalho (nome do usuário, link "Administração" só para admin, botão sair).
- `components/ui/`: botões, campos, cartões. Estilo com Tailwind v4 e ícones lucide-react; sem biblioteca de componentes.
- Interface toda em português.

---

## 9. Organização do repositório

```
./
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── start.sh · stop.sh
├── .gitignore
├── docs/ESPECIFICACAO.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── test/                      ← e2e (Vitest + Supertest)
│   └── src/
│       ├── main.ts                ← prefixo /api, ValidationPipe global
│       ├── app.module.ts          ← config validada, TypeORM
│       ├── config/                ← validação das variáveis de ambiente
│       ├── common/                ← enums, decorators, guards compartilhados
│       ├── health/
│       ├── auth/                  ← dto/, guards/, strategies/
│       ├── users/                 ← dto/, entities/, controller, service, module
│       └── transcriptions/        ← dto/, entities/, groq.client.ts, controller, service, module
└── frontend/
    ├── package.json
    ├── vite.config.ts             ← proxy /api → http://localhost:3000
    └── src/
        ├── main.tsx · App.tsx
        ├── pages/
        ├── components/ui/ · components/layout/
        ├── services/api.ts
        ├── store/authStore.ts
        └── types/
```

O projeto fica na raiz do repositório (sem subpasta `ditado/`).

**Versionado:** código-fonte, `package.json`, `package-lock.json`, `.env.example`, `docker-compose.yml`, `AGENTS.md`, `docs/`, `README.md`.
**Não versionado (`.gitignore`):** `node_modules/`, `dist/`, `.env`, `logs/`, `.pids/`, `*.log`, `coverage/`, o PDF da aula.

**Fim de linha:** um `.gitattributes` com `* text=auto eol=lf` garante LF em todos os arquivos de texto. Sem isso, o `core.autocrlf` do Git no Windows grava `start.sh` com CRLF, e o Bash falha com `$'\r': command not found`.

### 9.1 Scripts

- `start.sh`: sobe o banco (`docker compose up -d`), espera o PostgreSQL aceitar conexões, inicia `npm run start:dev` no backend e `npm run dev` no frontend em segundo plano, grava PIDs em `.pids/` e saídas em `logs/backend.log` e `logs/frontend.log`, e imprime os endereços.
- `stop.sh`: encerra os processos dos PIDs gravados (incluindo filhos) e remove os arquivos de PID. Não derruba o banco (`docker compose down` é manual).
- Rodam no Git Bash ou no WSL. No PowerShell: `docker compose up -d` na raiz e dois terminais com `npm run start:dev` (backend) e `npm run dev` (frontend).

---

## 10. Testes

- **E2E do backend** (Vitest + Supertest) em `backend/test/`, contra o banco `ditado_test` no mesmo contêiner (criado pelo setup de teste se não existir), com `synchronize: true` e limpeza das tabelas entre suítes. O `GroqClient` é substituído por um mock que devolve texto fixo ou lança erro, conforme o caso. Comando: `npm run test:e2e`.
- **Frontend:** `npm run build` (inclui `tsc`) sem erros.
- **Verificação manual** roteirizada no navegador, em cada etapa (seção 11).
- `npm run test:e2e` e o build do frontend passam antes de cada commit a partir da etapa 2.

---

## 11. Plano de etapas

Ciclo de cada etapa, com o Claude Code como agente:

1. **Pedido** — o usuário pede a etapa N desta especificação.
2. **Plano** — o Claude Code propõe o que vai fazer; o usuário lê e corrige.
3. **Execução** — o Claude Code cria e altera os arquivos.
4. **Verificação** — o usuário roda os critérios de aceite no próprio terminal e navegador. O relato do agente não substitui a saída do comando.
5. **Registro** — commit com a mensagem `etapa N: <nome>`.

Nenhuma etapa começa antes de a anterior ser verificada e registrada.

Nos critérios abaixo, `$TOKEN`, `$TOKEN_A`, `$TOKEN_B`, `$ADMIN` são tokens obtidos no login dos respectivos usuários; `$ID` é o id de uma transcrição.

### Etapa 0 — Artefatos

Entrega: `git init`, `.gitignore`, `.gitattributes`, `docs/ESPECIFICACAO.md`, `AGENTS.md`, `backend/.env.example`.

- [ ] `git status` limpo após o commit.
- [ ] `git check-ignore backend/.env` imprime o caminho (está ignorado).
- [ ] `backend/.env.example` não contém nenhum valor secreto.

### Etapa 1 — Fundação

Entrega: `docker-compose.yml`; backend NestJS com config validada, TypeORM e `GET /api/health`; frontend Vite + React + TypeScript + Tailwind v4 com proxy `/api`; `start.sh` e `stop.sh`.

- [ ] `docker compose ps` mostra `127.0.0.1:5433->5432/tcp`.
- [ ] `docker compose exec db psql -U ditado -c "select version();"` imprime `PostgreSQL 17…`.
- [ ] Backend sem `JWT_SECRET` no `.env` não sobe e a mensagem cita `JWT_SECRET`.
- [ ] `./start.sh` sobe backend e frontend; `logs/backend.log` e `logs/frontend.log` existem.
- [ ] `curl -s localhost:3000/api/health` → `{"status":"ok","db":"up"}`.
- [ ] `curl -s localhost:5173/api/health` (pelo proxy) → mesma resposta.
- [ ] `http://localhost:5173` abre uma página com estilo do Tailwind aplicado.
- [ ] `./stop.sh` encerra os dois processos; `curl localhost:3000/api/health` falha em seguida.

### Etapa 2 — Autenticação

Entrega: módulos `users` e `auth`; seed do admin; estratégia e guarda JWT; `@CurrentUser()`, `@Roles()`, `RolesGuard`; `toUserResponse()`. Frontend: `types/`, `authStore`, `api.ts` com interceptadores, `/entrar`, `/cadastro`, `ProtectedRoute`, layout interno, `/app` provisória.

- [ ] `POST /api/auth/register` com dados válidos → 201; o corpo **não** contém `passwordHash` nem `password`.
- [ ] Cadastro com `"role":"admin"` no corpo → 400.
- [ ] Cadastro com e-mail já usado (inclusive com maiúsculas diferentes) → 409.
- [ ] Cadastro com senha de 7 caracteres → 400.
- [ ] Login com senha errada → 401; com e-mail inexistente → 401 com a mesma mensagem.
- [ ] `GET /api/auth/me` sem token → 401; com `$TOKEN` → 200 com o usuário.
- [ ] `docker compose exec db psql -U ditado -c "select email, role from users;"` mostra o admin do seed com `admin`.
- [ ] Reiniciar o backend não duplica o admin.
- [ ] `select "passwordHash" from users` mostra hashes bcrypt (`$2…`), nunca senha em texto.
- [ ] Navegador: cadastrar → cai em `/app` logado; recarregar → continua logado; sair → acessar `/app` leva a `/entrar`.
- [ ] `npm run test:e2e` passa cobrindo os itens acima.

### Etapa 3 — Transcrições

Entrega: módulo `transcriptions` com `GroqClient`; tela `/app` (envio + histórico) e `/app/transcricoes/:id`.

- [ ] `curl -F "file=@teste.m4a;type=audio/mp4" -H "Authorization: Bearer $TOKEN" localhost:3000/api/transcriptions` → 201 com o texto em português. (O `;type=` é necessário porque o curl envia `application/octet-stream` para extensões que não reconhece; o navegador informa o mimetype sozinho.)
- [ ] Mesmo envio sem token → 401.
- [ ] Envio de `-F "file=@nota.txt;type=text/plain"` → 400; envio sem campo `file` → 400.
- [ ] Envio de arquivo com 26 MB → 413.
- [ ] Com `GROQ_API_KEY` inválida no `.env` (backend reiniciado) → 502, e o log não contém a chave.
- [ ] `GET /api/transcriptions` traz só as do próprio usuário, mais recentes primeiro.
- [ ] **Teste de dono:** com `$TOKEN_B`, `GET` e `DELETE /api/transcriptions/$ID` de uma transcrição da usuária A → 404 nos dois; com `$TOKEN_A`, a transcrição continua acessível (200).
- [ ] `GET /api/transcriptions/abc` → 400.
- [ ] `DELETE` da própria transcrição → 204; `GET` em seguida → 404.
- [ ] Navegador: enviar o áudio de teste → "Transcrevendo…" → texto aparece e o histórico atualiza sem recarregar; copiar funciona; detalhe abre; excluir com confirmação remove do histórico.
- [ ] `npm run test:e2e` passa (com `GroqClient` mockado) cobrindo os itens acima.

### Etapa 4 — Administração

Entrega: `GET /api/users`, `PATCH /api/users/:id`; tela `/app/admin`; link "Administração" no cabeçalho.

- [ ] `GET /api/users` com token de usuário comum → 403; com `$ADMIN` → 200, sem `passwordHash` em nenhum item.
- [ ] `PATCH /api/users/:id` com `{"role":"admin"}` em outro usuário → 200 com o papel novo.
- [ ] `PATCH` com campo extra (ex.: `{"email":"x@y.z"}`) → 400.
- [ ] `PATCH` do admin em si mesmo → 400.
- [ ] Desativar um usuário: o token antigo dele em `GET /api/auth/me` → 401; novo login → 403.
- [ ] Rebaixar um admin: o token antigo dele em `GET /api/users` → 403.
- [ ] Navegador: usuário comum não vê o link e, ao digitar `/app/admin`, vai para `/app`; admin vê a tabela, as ações funcionam e ficam desabilitadas na própria linha.
- [ ] `npm run test:e2e` passa cobrindo os itens acima.

### Etapa 5 — Landing e entrega

Entrega: landing `/`, página 404, acabamento visual, `README.md`.

- [ ] Navegador: `/` deslogado mostra a landing com "Criar conta"; logado, "Ir para o app"; `/qualquer-coisa` mostra a 404.
- [ ] `grep -rn "localhost:3000" frontend/src` não encontra nada.
- [ ] `README.md` traz: pré-requisitos, rodar do zero (Git Bash e PowerShell), como criar o `.env`, como rodar os testes e a **declaração de uso de IA** (ferramenta: Claude Code; modelo: Claude Opus 5.5; etapas em que foi usado).
- [ ] Clone limpo em outra pasta + passos do README → aplicação funcionando.
- [ ] `unzip -l entrega.zip | grep -E "\.env$|node_modules"` não lista nada.

---

## 12. Checklist de revisão do código gerado

Conferido ao fim de cada etapa, antes do commit:

- Nenhuma resposta da API contém `passwordHash` (procurar entidade `User` devolvida diretamente).
- Nenhum DTO de cadastro ou de alteração aceita campo que o usuário não deveria controlar (`role` no cadastro, `email`/`passwordHash` no `PATCH`).
- Nenhum controller importa `Repository` nem contém regra de negócio.
- Toda consulta de transcrição filtra por dono na própria consulta.
- Nenhum endereço absoluto do backend nem segredo no frontend.
- Nenhum segredo em código, log ou arquivo versionado.
- Mudança de contrato aparece nos dois lados (backend e `frontend/src/types/`) no mesmo commit.
