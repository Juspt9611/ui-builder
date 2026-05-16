# ui-builder

POC for a V0/Lovable-style UI generator: the user provides a natural-language prompt and the system generates a graphical interface as runnable code. An end-to-end flow exists — home prompt → REST API → AI layer (OpenRouter LLM, with mock fallback) → chat view with iframe sandbox preview. Users can refine an existing app via follow-up prompts; the current HTML is passed as context to the LLM on each edit. Persistence is in-memory only.

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
│   │   │       │   ├── ai.module.ts          # dynamic module (forRoot()); registers only the chosen provider via useFactory+ConfigService
│   │   │       │   ├── ai.provider.ts        # abstract AiProvider
│   │   │       │   ├── providers/
│   │   │       │   │   ├── mock-ai.provider.ts
│   │   │       │   │   ├── openrouter-ai.provider.ts   # real LLM via fetch
│   │   │       │   │   └── utils/
│   │   │       │   │       └── extract-html-document.ts  # sanity extractor for LLM output
│   │   │       │   ├── prompts/
│   │   │       │   │   └── system-prompt.ts  # base system prompt for HTML generation
│   │   │       │   └── types/
│   │   │       │       └── ai.types.ts
│   │   │       └── chats/
│   │   │           ├── chats.module.ts
│   │   │           ├── chats.controller.ts
│   │   │           ├── chats.service.ts
│   │   │           ├── chats.repository.ts   # in-memory Map store
│   │   │           ├── dto/
│   │   │           │   ├── create-chat.dto.ts
│   │   │           │   ├── add-message.dto.ts
│   │   │           │   └── chat-response.dto.ts  # HTTP response shape (entity/DTO split)
│   │   │           └── entities/
│   │   │               └── chat.entity.ts        # persistence-only: user messages with code
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── .env           # PORT, FRONTEND_ORIGIN, AI_PROVIDER, OPENROUTER_*
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
│       │           ├── CodePreview.tsx       # iframe sandbox preview (with empty state)
│       │           └── CodeViewer.tsx        # read-only HTML viewer with syntax highlighting + copy-to-clipboard
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
| Backend config | `@nestjs/config` (global `isGlobal: true`, reads `.env`) |
| Backend validation | `class-validator` + `class-transformer` (global `ValidationPipe`) |
| Backend IDs | `uuid` v14 |
| Backend testing | Jest 30 + Supertest (e2e) |
| Backend AI | OpenRouter REST API via Node 22 native `fetch` (no SDK) |
| Frontend framework | Next.js 16.2.6 — App Router |
| Frontend language | TypeScript 5 |
| Frontend UI | React 19.2.4 |
| Frontend styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Frontend HTTP | Native `fetch` via `services/http.ts` (no axios/swr/react-query) |
| Frontend state | Plain `useState` (no Zustand/Redux) |
| Frontend syntax highlighting | `highlight.js` (core + `xml` language only, ~30–50 KB) |
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

## AI Provider

The AI layer is controlled by `AI_PROVIDER` in `.env`. `AiModule` is a dynamic module (`AiModule.forRoot()`) that registers only the chosen implementation — the selection happens inside a `useFactory` that injects `ConfigService`, so the env value is read during the DI resolution phase (after `ConfigModule` has loaded `.env`):

| `AI_PROVIDER` | Provider | Behavior |
|---|---|---|
| `mock` (default) | `MockAiProvider` | Returns hardcoded "Hello World" HTML, ignores prompt |
| `openrouter` | `OpenRouterAiProvider` | Calls OpenRouter REST API, returns real LLM-generated HTML |

### Switching to OpenRouter

Set in `apps/backend/.env`:

```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free   # or any free model from openrouter.ai/models
```

### Output contract

`AiProvider.generate({ prompt, currentCode? })` returns `{ code: string, assistantMessage: string }`:
- `code` — complete self-contained HTML document (`<!DOCTYPE html>…</html>`). Stored on the user `Message` that triggered the generation.
- `currentCode` — when present (follow-up turns), the provider injects it as a prior user message wrapped in `<current_app>` tags so the LLM can apply edits to the existing app rather than regenerating from scratch.
- `assistantMessage` — canned text returned by the provider, kept in the contract for future use but not consumed by `ChatsService` today (the service generates its own text in the DTO mapper).

### System prompt

The base prompt is in [apps/backend/src/modules/ai/prompts/system-prompt.ts](apps/backend/src/modules/ai/prompts/system-prompt.ts). Key constraints enforced:
- Return **only** the HTML document, no markdown fences, no preamble.
- All CSS and JS must be inline — no external CDN for scripts, stylesheets, or fonts.
- **Images only** — the LLM may use `https://picsum.photos/{w}/{h}` (realistic photos) and `https://placehold.co/{w}x{h}?text={label}` (labeled placeholders). All other image hosts are forbidden; the runtime sanitizer replaces violating URLs automatically.
- **No API calls** (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`).
- **No dangerous browser APIs** (`eval`, `Function()`, `document.write`, geolocation, etc.).
- **No tracking code** (Google Analytics, GTM, pixels, beacons).
- Static mock data embedded inline; no TODOs or placeholders.
- On follow-ups: regenerate the full document with changes applied, never return diffs.

### HTML extraction and sanitization

The LLM output goes through two sequential defenses in `OpenRouterAiProvider.generate()`:

1. **`extractHtmlDocument`** ([apps/backend/src/modules/ai/providers/utils/extract-html-document.ts](apps/backend/src/modules/ai/providers/utils/extract-html-document.ts)) — structural validation: happy path (pure HTML), markdown fence fallback, preamble fallback. Throws if no valid HTML document is found.

2. **`sanitizeRemoteUrls`** ([apps/backend/src/modules/ai/providers/utils/sanitize-remote-urls.ts](apps/backend/src/modules/ai/providers/utils/sanitize-remote-urls.ts)) — URL allowlist enforcement: replaces any absolute URL whose host is not in `ALLOWED_IMAGE_HOSTS` (`picsum.photos`, `placehold.co`) with `FALLBACK_PLACEHOLDER` (`https://placehold.co/600x400?text=Image`). Uses a single regex over the raw HTML string so it catches URLs in `src`, `srcset`, `href`, inline CSS `url(...)`, and JS strings alike. Logs a warning when replacements occur. Tested via `sanitize-remote-urls.spec.ts`.

## API surface

CORS is restricted to `FRONTEND_ORIGIN`. All request bodies are validated by the global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform).

### `Chat` resource shape

There are two representations:

**Persistence entity** (`chat.entity.ts`) — what `ChatsRepository` stores. Only user turns, no `role`:
```ts
{
  id: string;
  messages: {
    id: string;
    content: string;
    code: string;      // full HTML generated by this turn
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
```

**HTTP response DTO** (`chat-response.dto.ts`) — what all three endpoints return. `ChatsService.toChatResponseDto()` maps each persisted user message to a user + assistant pair, so the chat always looks complete (even on reload). The assistant message is a canned string generated in the service:
```ts
{
  id: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    code?: string;     // present on role: "user" messages only
    createdAt: string;
  }[];
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
- **Entity/DTO split**: the persistence entity (`chat.entity.ts`) reflects only what is stored. The HTTP response shape lives in `chat-response.dto.ts` and is constructed by `ChatsService.toChatResponseDto()`. Do not add presentation concerns (e.g. `role`, fabricated assistant messages) to the entity.
- **Abstract provider pattern**: external services (AI, future integrations) are exposed as abstract classes (e.g. `AiProvider`) and injected via the NestJS DI token. `AiModule` is a dynamic module — call `AiModule.forRoot()` in the consuming module's `imports`. It registers only the concrete provider chosen by `AI_PROVIDER` via a `useFactory` that injects `ConfigService` (so the env value is read at DI resolution time, not at module graph construction time). Only the chosen provider is instantiated; the unused one is never created. `ChatsService` never imports a concrete provider.
- **Env vars**: add new variables to [apps/backend/.env](apps/backend/.env) and [apps/backend/.env.example](apps/backend/.env.example). Access them via `ConfigService` from `@nestjs/config` (`isGlobal: true`, no need to import `ConfigModule` in feature modules).
- **ESM-only packages**: the backend compiles to CommonJS. Do not add ESM-only npm packages as static imports. Use Node 22 native `fetch` for HTTP calls to external APIs — it is available globally with no additional dependencies.

### Frontend

- **No Prettier config** — linting only via `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- **Path alias**: `@/*` resolves to the project root (`apps/frontend/`) — configured in [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json). Use `@/components/...`, `@/services/...`, `@/types/...`.
- **App Router**: pages and layouts go under `apps/frontend/app/`. Shared UI components belong in `components/` (top-level, not inside `app/`); API client code in `services/`; shared types in `types/`.
- **Route-scoped components**: components used only by a single route can be co-located inside that route's folder (e.g. `app/chat/components/`). These are not route segments — no `page.tsx`/`layout.tsx` — just a colocation folder.
- **Data fetching**: server components fetch with `cache: 'no-store'`. All fetch calls go through the shared wrapper in [apps/frontend/services/http.ts](apps/frontend/services/http.ts), which injects JSON headers and throws on non-OK responses.
- **Tailwind v4**: configured via PostCSS in [apps/frontend/postcss.config.mjs](apps/frontend/postcss.config.mjs). Theme tokens are defined in [apps/frontend/app/globals.css](apps/frontend/app/globals.css) using `@theme inline`.
- **Output panel tabs**: `ChatWorkspace` renders a segmented control (Preview / Code) in the right panel header. The active tab state (`useState<'preview' | 'code'>`) switches between `CodePreview` (iframe) and `CodeViewer` (syntax-highlighted HTML). The panel wrapper uses `position: relative` so both components can use `absolute inset-0` to fill it reliably without percentage-height quirks in flex contexts.
- **iframe preview**: generated HTML is rendered inside a sandboxed `<iframe srcDoc={code} sandbox="allow-scripts">` in `CodePreview.tsx`. When `code` is empty, a placeholder "Your application will appear here" is shown instead of a blank iframe. The AI layer always returns a full self-contained HTML document, so no bundling step is needed. `ChatWorkspace` derives the code to display from the last user `Message` that carries a `code` field (`[...chat.messages].reverse().find(m => m.role === 'user' && m.code)?.code`).
- **Code viewer**: `CodeViewer.tsx` renders the generated HTML with `highlight.js` (core build + `xml` language registered as `html`). Highlighting is computed in `useMemo` and injected via `dangerouslySetInnerHTML` — safe because `hljs.highlight()` escapes the output. A "Copy" button in the component header uses `navigator.clipboard.writeText` with a transient "Copied!" state (1.5 s timeout, cleaned up on unmount). The `github-dark` theme is imported globally in `globals.css`.
- **UI copy language**: English.

## Entry points

| File | Role |
|---|---|
| [apps/backend/src/main.ts](apps/backend/src/main.ts) | Bootstrap NestJS app, enable CORS + global ValidationPipe, listen on `PORT` |
| [apps/backend/src/app.module.ts](apps/backend/src/app.module.ts) | Root NestJS module |
| [apps/backend/src/modules/chats/chats.controller.ts](apps/backend/src/modules/chats/chats.controller.ts) | HTTP surface for chat endpoints |
| [apps/backend/src/modules/ai/ai.provider.ts](apps/backend/src/modules/ai/ai.provider.ts) | Abstract contract for AI generation |
| [apps/backend/src/modules/ai/providers/openrouter-ai.provider.ts](apps/backend/src/modules/ai/providers/openrouter-ai.provider.ts) | Concrete OpenRouter implementation |
| [apps/backend/src/modules/ai/prompts/system-prompt.ts](apps/backend/src/modules/ai/prompts/system-prompt.ts) | System prompt sent to the LLM |
| [apps/frontend/app/layout.tsx](apps/frontend/app/layout.tsx) | Root Next.js layout (fonts, metadata) |
| [apps/frontend/app/page.tsx](apps/frontend/app/page.tsx) | Home route `/` — renders `<PromptForm />` |
| [apps/frontend/app/chat/[id]/page.tsx](apps/frontend/app/chat/[id]/page.tsx) | Chat route `/chat/:id` — server component |
| [apps/frontend/services/http.ts](apps/frontend/services/http.ts) | Base fetch wrapper used by all service calls |

## Environment variables

| File | Variable | Default | Notes |
|---|---|---|---|
| [apps/backend/.env](apps/backend/.env) | `PORT` | `3001` | Backend listen port |
| [apps/backend/.env](apps/backend/.env) | `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| [apps/backend/.env](apps/backend/.env) | `AI_PROVIDER` | `mock` | `mock` or `openrouter` |
| [apps/backend/.env](apps/backend/.env) | `OPENROUTER_API_KEY` | — | Required when `AI_PROVIDER=openrouter` |
| [apps/backend/.env](apps/backend/.env) | `OPENROUTER_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` | Any model slug from openrouter.ai/models |
| [apps/backend/.env](apps/backend/.env) | `OPENROUTER_SITE_URL` | — | Optional; sent as `HTTP-Referer` header |
| [apps/backend/.env](apps/backend/.env) | `OPENROUTER_APP_NAME` | — | Optional; sent as `X-Title` header |
| (frontend, no `.env` file yet) | `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Backend base URL; set in env to override |

`apps/backend/.env.example` documents all backend variables. Create `apps/frontend/.env.local` to override `NEXT_PUBLIC_BACKEND_URL` locally.

## Known caveats

- **Nested git repo (resolved)**: `apps/backend/` previously had its own `.git/` directory. It has been removed — the outer monorepo now tracks all backend files directly.
- **Root `pnpm test` is a placeholder** — it always exits 1. Run tests per-app: `pnpm --filter backend test` or `pnpm --filter backend test:e2e`.
- **`ChatsRepository` is in-memory** — all chat state lives in a `Map` and is lost when the backend restarts. A persistent store (DB) is a future concern.
- **No streaming** — endpoints return a full chat snapshot after the AI call completes. Generation can take 5–20 seconds depending on the model. Streaming (SSE or chunked) is a future improvement.
- **Missing shared configs**: no root `tsconfig.base.json`, no shared ESLint config, no root `.prettierrc`, no Dockerfile, no CI configuration. These should be introduced as the POC grows.

## Intended direction

Phases 1 (scaffolding), 2 (real AI integration), 3 (edit flow with code-as-context), and 4 (code inspection — Preview/Code tabs with syntax highlighting and copy-to-clipboard) are complete. Remaining next steps:

1. **Streaming**: stream the LLM response token-by-token via SSE or chunked transfer to improve perceived latency.
2. **Persistence**: replace `ChatsRepository`'s in-memory `Map` with a real database so chat history survives restarts.
3. **Error UX**: surface AI generation errors to the user in the frontend (currently swallowed in `ChatWorkspace`).
4. **Dynamic assistant messages**: `AiProvider.generate()` already returns `assistantMessage` — wire it into the DTO mapper so the assistant bubble reflects actual LLM feedback instead of a canned string.
