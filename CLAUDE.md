# ui-builder

POC for a V0/Lovable-style UI generator: the user provides a natural-language prompt and the system generates a graphical interface as runnable code. An end-to-end flow exists today — home prompt → REST API → AI layer (currently mocked) → chat view with iframe sandbox preview. Persistence is in-memory only; the real AI provider is still TBD.

## Repo layout

```
ui-builder/
├── apps/
│   ├── backend/          # NestJS API (port 3001)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   └── modules/
│   │   │       ├── ai/
│   │   │       │   ├── ai.module.ts
│   │   │       │   ├── ai.provider.ts        # abstract AiProvider
│   │   │       │   ├── providers/
│   │   │       │   │   └── mock-ai.provider.ts
│   │   │       │   └── types/
│   │   │       │       └── ai.types.ts
│   │   │       └── chats/
│   │   │           ├── chats.module.ts
│   │   │           ├── chats.controller.ts
│   │   │           ├── chats.service.ts
│   │   │           ├── chats.repository.ts   # in-memory Map store
│   │   │           ├── dto/
│   │   │           │   ├── create-chat.dto.ts
│   │   │           │   └── add-message.dto.ts
│   │   │           └── entities/
│   │   │               └── chat.entity.ts
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── .env           # PORT + FRONTEND_ORIGIN
│   │   └── .env.example
│   └── frontend/          # Next.js App Router (port 3000)
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   └── chat/
│       │       ├── [id]/
│       │       │   └── page.tsx              # server component, renders ChatWorkspace
│       │       └── components/               # chat-scoped, not a route
│       │           ├── ChatWorkspace.tsx
│       │           ├── ChatMessages.tsx
│       │           ├── ChatComposer.tsx
│       │           ├── MessageBubble.tsx
│       │           └── CodePreview.tsx       # iframe sandbox preview
│       ├── components/
│       │   └── PromptForm.tsx
│       ├── services/
│       │   ├── chats.ts
│       │   ├── config.ts
│       │   └── http.ts
│       ├── types/
│       │   └── chat.ts
│       ├── public/
│       ├── next.config.ts
│       └── tsconfig.json
├── package.json            # root pnpm workspace scripts
└── pnpm-workspace.yaml     # packages: apps/*
```

## Tech stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS 11 (Express adapter) |
| Backend language | TypeScript 5.7 |
| Backend config | `@nestjs/config` (global, reads `.env`) |
| Backend validation | `class-validator` + `class-transformer` (global `ValidationPipe`) |
| Backend IDs | `uuid` v14 |
| Backend testing | Jest 30 + Supertest (e2e) |
| Frontend framework | Next.js 16.2.6 — App Router |
| Frontend language | TypeScript 5 |
| Frontend UI | React 19.2.4 |
| Frontend styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Frontend HTTP | Native `fetch` via `services/http.ts` (no axios/swr/react-query) |
| Frontend state | Plain `useState` (no Zustand/Redux) |
| Package manager | pnpm workspaces |
| Linting | ESLint 9 flat config (each app independently) |
| Formatting | Prettier 3 (backend only) |

## Running locally

```bash
# from repo root
pnpm install

# in one terminal
pnpm dev:frontend     # → http://localhost:3000

# in another terminal
pnpm dev:backend      # → http://localhost:3001
```

Backend port is set in [apps/backend/.env](apps/backend/.env) (`PORT=3001`).

## API surface

CORS is restricted to `FRONTEND_ORIGIN`. All request bodies are validated by the global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform).

### `Chat` resource shape

```ts
{
  id: string;          // uuid
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string; // ISO 8601
  }[];
  code: string;        // latest generated HTML
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/chats` | `{ prompt: string }` (max 4000 chars) | Create chat, trigger first AI generation |
| `GET` | `/chats/:id` | — | Fetch chat by id |
| `POST` | `/chats/:id/messages` | `{ content: string }` (max 4000 chars) | Append user message, trigger AI generation, return updated chat |

## Per-app scripts

Use `pnpm --filter <name> <script>` from the repo root, or `pnpm <script>` from inside the app directory.

**Backend** (`apps/backend/`):

| Script | What it does |
|---|---|
| `start:dev` | Watch mode (used by `pnpm dev:backend`) |
| `build` | `nest build` → `dist/` |
| `start:prod` | `node dist/main` |
| `lint` | ESLint `--fix` on `src/` and `test/` |
| `format` | Prettier `--write` |
| `test` | Unit tests (Jest) |
| `test:cov` | Unit tests with coverage |
| `test:e2e` | End-to-end tests (Supertest) |

**Frontend** (`apps/frontend/`):

| Script | What it does |
|---|---|
| `dev` | Next.js dev server (used by `pnpm dev:frontend`) |
| `build` | Next.js production build |
| `start` | Serve production build |
| `lint` | ESLint via `eslint-config-next` |

## Conventions

### Backend

- **Prettier**: single quotes, trailing commas on all — configured in [apps/backend/.prettierrc](apps/backend/.prettierrc).
- **ESLint**: flat config (`eslint.config.mjs`) using `typescript-eslint` recommended-type-checked + Prettier.
- **Module pattern**: each feature gets its own NestJS module under [apps/backend/src/modules/](apps/backend/src/modules/). `ChatsModule` and `AiModule` are the current examples. Register new modules in `AppModule`.
- **DTOs + ValidationPipe**: all controller inputs must use a DTO class with `class-validator` decorators. The global `ValidationPipe` (whitelist + `forbidNonWhitelisted`) rejects undeclared properties automatically.
- **Abstract provider pattern**: external services (AI, future integrations) are exposed as abstract classes (e.g. `AiProvider`) and injected via the NestJS DI token. The concrete implementation is swapped in the module (`MockAiProvider` today). `ChatsService` never imports a concrete provider directly.
- **Env vars**: add new variables to [apps/backend/.env](apps/backend/.env) and [apps/backend/.env.example](apps/backend/.env.example). Access them via `ConfigService` from `@nestjs/config` (already loaded globally in `AppModule`).

### Frontend

- **No Prettier config** — linting only via `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- **Path alias**: `@/*` resolves to the project root (`apps/frontend/`) — configured in [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json). Use `@/components/...`, `@/services/...`, `@/types/...`.
- **App Router**: pages and layouts go under `apps/frontend/app/`. Shared UI components belong in `components/` (top-level, not inside `app/`); API client code in `services/`; shared types in `types/`.
- **Route-scoped components**: components used only by a single route can be co-located inside that route's folder (e.g. `app/chat/components/`). These are not route segments — no `page.tsx`/`layout.tsx` — just a colocation folder.
- **Data fetching**: server components fetch with `cache: 'no-store'`. All fetch calls go through the shared wrapper in [apps/frontend/services/http.ts](apps/frontend/services/http.ts), which injects JSON headers and throws on non-OK responses.
- **Tailwind v4**: configured via PostCSS in [apps/frontend/postcss.config.mjs](apps/frontend/postcss.config.mjs). Theme tokens are defined in [apps/frontend/app/globals.css](apps/frontend/app/globals.css) using `@theme inline`.
- **iframe preview**: generated HTML is rendered inside a sandboxed `<iframe srcDoc={code} sandbox="allow-scripts">` in `CodePreview.tsx`. No bundling step today because the AI layer returns a full self-contained HTML document.

## Entry points

| File | Role |
|---|---|
| [apps/backend/src/main.ts](apps/backend/src/main.ts) | Bootstrap NestJS app, enable CORS + global ValidationPipe, listen on `PORT` |
| [apps/backend/src/app.module.ts](apps/backend/src/app.module.ts) | Root NestJS module |
| [apps/backend/src/modules/chats/chats.controller.ts](apps/backend/src/modules/chats/chats.controller.ts) | HTTP surface for chat endpoints |
| [apps/backend/src/modules/ai/ai.provider.ts](apps/backend/src/modules/ai/ai.provider.ts) | Abstract contract for AI generation |
| [apps/frontend/app/layout.tsx](apps/frontend/app/layout.tsx) | Root Next.js layout (fonts, metadata) |
| [apps/frontend/app/page.tsx](apps/frontend/app/page.tsx) | Home route `/` — renders `<PromptForm />` |
| [apps/frontend/app/chat/[id]/page.tsx](apps/frontend/app/chat/[id]/page.tsx) | Chat route `/chat/:id` — server component |
| [apps/frontend/services/http.ts](apps/frontend/services/http.ts) | Base fetch wrapper used by all service calls |

## Environment variables

| File | Variable | Default | Notes |
|---|---|---|---|
| [apps/backend/.env](apps/backend/.env) | `PORT` | `3001` | Backend listen port |
| [apps/backend/.env](apps/backend/.env) | `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| (frontend, no `.env` file yet) | `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Backend base URL; set in env to override |

`apps/backend/.env.example` documents the backend variables. Create `apps/frontend/.env.local` to override `NEXT_PUBLIC_BACKEND_URL` locally.

## Known caveats

- **Nested git repo (resolved)**: `apps/backend/` previously had its own `.git/` directory. It has been removed — the outer monorepo now tracks all backend files directly.
- **Root `pnpm test` is a placeholder** — it always exits 1. Run tests per-app: `pnpm --filter backend test` or `pnpm --filter backend test:e2e`.
- **`ChatsRepository` is in-memory** — all chat state lives in a `Map` and is lost when the backend restarts. A persistent store (DB) is a future concern.
- **`MockAiProvider` returns hardcoded HTML** — it ignores the prompt entirely. Any real AI provider must be wired in before the generation logic is meaningful.
- **Missing shared configs**: no root `tsconfig.base.json`, no shared ESLint config, no root `.prettierrc`, no Dockerfile, no CI configuration. These should be introduced as the POC grows.

## Intended direction

The end-to-end scaffolding (chat flow + iframe preview) is in place. The next steps are:

1. **Real AI provider**: replace `MockAiProvider` with a concrete implementation using Anthropic Claude, OpenAI, or the Vercel AI SDK. The abstract `AiProvider` interface is already defined — only the module binding changes.
2. **Streaming**: the current endpoints return full chat snapshots after the AI call completes. Streaming responses (SSE or chunked) would improve perceived latency.
3. **Persistence**: replace `ChatsRepository`'s in-memory `Map` with a real database so chat history survives restarts.
4. **Bundling** (if needed): the iframe preview works today because the mock returns a self-contained HTML document. If a real provider returns JSX/TSX instead, a bundling step (e.g. esbuild in-browser or a server-side transform) will be required.
