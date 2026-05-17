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
│   │   │       │   ├── errors/
│   │   │       │   │   └── unprocessable-prompt.exception.ts  # HTTP 422; exports CANNOT_INTERPRET_SENTINEL
│   │   │       │   ├── providers/
│   │   │       │   │   ├── mock-ai.provider.ts
│   │   │       │   │   ├── mock-ai.provider.spec.ts
│   │   │       │   │   ├── openrouter-ai.provider.ts   # real LLM via fetch
│   │   │       │   │   ├── openrouter-ai.provider.spec.ts
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
│       │           ├── CodeViewer.tsx        # read-only HTML viewer with syntax highlighting + copy-to-clipboard
│       │           ├── Timestamp.tsx         # client component; formats message.createdAt in browser timezone via Intl.DateTimeFormat
│       │           ├── TruncationConfirmModal.tsx  # confirmation modal shown before discarding later versions on a rollback edit
│       │           ├── RegenerateConfirmModal.tsx  # confirmation modal shown before navigating home to start over
│       │           └── ErrorBanner.tsx       # ephemeral warning/error banner shown above ChatComposer; auto-dismisses after 6 s
│       ├── components/
│       │   └── PromptForm.tsx
│       ├── services/
│       │   ├── chats.ts
│       │   ├── config.ts                     # getBackendUrl(); HTTP-related config only
│       │   ├── errors.ts                     # ApiErrorCode const object (UNPROCESSABLE_PROMPT); shared across components
│       │   └── http.ts
│       ├── shared/
│       │   └── storage-keys.ts               # client-side storage key constants (sessionStorage / localStorage)
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
| `mock` (default) | `MockAiProvider` | Returns hardcoded "Hello World" HTML. Throws `UnprocessablePromptException` (422) if prompt contains `__cannot__` — useful for testing the error UX without OpenRouter. |
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
- **Unprocessable sentinel**: if the request is genuinely impossible to render as a UI (gibberish, empty intent, completely off-topic), the LLM must respond with exactly one line `CANNOT_INTERPRET: <reason>` and nothing else. This overrides the `<!DOCTYPE html>` rule. The sentinel string is defined as `CANNOT_INTERPRET_SENTINEL` in [apps/backend/src/modules/ai/errors/unprocessable-prompt.exception.ts](apps/backend/src/modules/ai/errors/unprocessable-prompt.exception.ts) and interpolated into the prompt at build time.

### HTML extraction and sanitization

The LLM output goes through three sequential defenses in `OpenRouterAiProvider.generate()`:

1. **Sentinel check** — before any HTML validation, the raw response is matched against `/^CANNOT_INTERPRET:\s*(.*)$/`. If matched, `UnprocessablePromptException` (HTTP 422) is thrown immediately and no code is stored. This must happen before `extractHtmlDocument` so it is not mistaken for a malformed HTML response.

2. **`extractHtmlDocument`** ([apps/backend/src/modules/ai/providers/utils/extract-html-document.ts](apps/backend/src/modules/ai/providers/utils/extract-html-document.ts)) — structural validation: happy path (pure HTML), markdown fence fallback, preamble fallback. Throws if no valid HTML document is found.

3. **`sanitizeRemoteUrls`** ([apps/backend/src/modules/ai/providers/utils/sanitize-remote-urls.ts](apps/backend/src/modules/ai/providers/utils/sanitize-remote-urls.ts)) — URL allowlist enforcement: replaces any absolute URL whose host is not in `ALLOWED_IMAGE_HOSTS` (`picsum.photos`, `placehold.co`) with `FALLBACK_PLACEHOLDER` (`https://placehold.co/600x400?text=Image`). Uses a single regex over the raw HTML string so it catches URLs in `src`, `srcset`, `href`, inline CSS `url(...)`, and JS strings alike. Logs a warning when replacements occur. Tested via `sanitize-remote-urls.spec.ts`.

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
| `POST` | `/chats/:id/messages` | `{ content: string, fromMessageId?: string }` (content max 4000 chars) | Append user message, trigger AI generation, return updated chat. When `fromMessageId` is provided, all messages stored after that user message are discarded and its `code` is used as `currentCode` for the LLM (version rollback). |

#### `fromMessageId` rollback semantics

`fromMessageId` must be the `id` of a persisted **user** message (the stable entity id). The assistant message ids in the HTTP response DTO are regenerated on every read and must not be used as rollback references. `ChatsService.addMessage` resolves the anchor, calls `aiProvider.generate` first, and only if generation succeeds does it call `ChatsRepository.truncateAfter` followed by `appendMessage`. This ordering guarantees that a failed generation (including 422 from an unprocessable prompt) leaves the repository intact — no truncation without a new version to replace it. If `fromMessageId` points to the last stored message no truncation occurs — the call degrades to a normal append.

#### Unprocessable prompt error contract

When `AiProvider.generate` throws `UnprocessablePromptException`, the exception propagates through `ChatsService` (no catch) and is serialized by Nest's built-in exception filter as:

```
HTTP 422 Unprocessable Entity
{ "errorCode": "UNPROCESSABLE_PROMPT", "message": "<reason from the model>" }
```

Nothing is persisted. The frontend detects this via `err.errorCode === ApiErrorCode.UNPROCESSABLE_PROMPT` (see `services/errors.ts`) and shows a warning banner without adding a bubble or changing the preview.

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
- **Path alias**: `@/*` resolves to the project root (`apps/frontend/`) — configured in [apps/frontend/tsconfig.json](apps/frontend/tsconfig.json). Use `@/components/...`, `@/services/...`, `@/types/...`, `@/shared/...`.
- **App Router**: pages and layouts go under `apps/frontend/app/`. Shared UI components belong in `components/` (top-level, not inside `app/`); API client code in `services/`; shared types in `types/`; client-side non-HTTP constants (storage keys, etc.) in `shared/`.
- **Storage keys**: all `sessionStorage`/`localStorage` key strings are centralised in [apps/frontend/shared/storage-keys.ts](apps/frontend/shared/storage-keys.ts). Do not inline key strings in components — import from there. Keep HTTP-related config (`getBackendUrl`) in `services/config.ts` and storage constants in `shared/storage-keys.ts`.
- **Route-scoped components**: components used only by a single route can be co-located inside that route's folder (e.g. `app/chat/components/`). These are not route segments — no `page.tsx`/`layout.tsx` — just a colocation folder.
- **Data fetching**: server components fetch with `cache: 'no-store'`. All fetch calls go through the shared wrapper in [apps/frontend/services/http.ts](apps/frontend/services/http.ts), which injects JSON headers and throws on non-OK responses. The thrown `Error` carries two extra properties: `status: number` (HTTP status code) and `errorCode?: string` (value from `body.errorCode` when present). Components use these to differentiate error types.
- **API error codes**: shared string constants live in [apps/frontend/services/errors.ts](apps/frontend/services/errors.ts) as `ApiErrorCode` (`as const` object). Import from there — never compare against raw string literals like `'UNPROCESSABLE_PROMPT'`.
- **Tailwind v4**: configured via PostCSS in [apps/frontend/postcss.config.mjs](apps/frontend/postcss.config.mjs). Theme tokens are defined in [apps/frontend/app/globals.css](apps/frontend/app/globals.css) using `@theme inline`.
- **Output panel tabs**: `ChatWorkspace` renders a segmented control (Preview / Code) in the right panel header. The active tab state (`useState<'preview' | 'code'>`) switches between `CodePreview` (iframe) and `CodeViewer` (syntax-highlighted HTML). The panel wrapper uses `position: relative` so both components can use `absolute inset-0` to fill it reliably without percentage-height quirks in flex contexts.
- **iframe preview**: generated HTML is rendered inside a sandboxed `<iframe srcDoc={code} sandbox="allow-scripts">` in `CodePreview.tsx`. When `code` is empty, a placeholder "Your application will appear here" is shown instead of a blank iframe. The AI layer always returns a full self-contained HTML document, so no bundling step is needed.
- **Code viewer**: `CodeViewer.tsx` renders the generated HTML with `highlight.js` (core build + `xml` language registered as `html`). Highlighting is computed in `useMemo` and injected via `dangerouslySetInnerHTML` — safe because `hljs.highlight()` escapes the output. A "Copy" button in the component header uses `navigator.clipboard.writeText` with a transient "Copied!" state (1.5 s timeout, cleaned up on unmount). The `github-dark` theme is imported globally in `globals.css`.
- **Version history mode**: `ChatWorkspace` keeps `selectedUserMessageId: string | null` state. When set, `previewCode` resolves to that user message's `code`; when null it falls back to the last user message with code (default). Each assistant bubble renders a "View this version / Viewing this version" button (with an eye icon) that toggles the selection — clicking a selected bubble deselects it. Bubbles whose version index is greater than the selected one are rendered at `opacity-40` to signal they will be discarded if the user edits. On send, `ChatWorkspace.handleSend` detects editing-on-older-version and opens `TruncationConfirmModal` showing the discard count before proceeding. On confirmation it calls `addMessage` with `fromMessageId`, receives the truncated chat, sets state, and clears the selection so the panel jumps to the newly generated version. No explicit refetch is needed — the POST response always returns the full (post-truncation) chat.
- **Message timestamps**: `Timestamp.tsx` is a client component that mounts the formatted date in a `useEffect` (avoiding SSR/hydration timezone mismatch) using `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })`, which picks the browser's local timezone automatically. It renders with `suppressHydrationWarning`. `MessageBubble` renders a `<Timestamp>` above every bubble, aligned to the bubble's side.
- **Error feedback**: `ChatWorkspace.sendMessage` wraps the `addMessage` call in `try/catch/finally`. On catch it sets `banner` state (`BannerState = { message, tone: 'warning' | 'error' }`): tone `warning` for `UNPROCESSABLE_PROMPT`, tone `error` for everything else. The exception is re-thrown so `ChatComposer` can restore the user's text (optimistic clear + catch restore pattern). `ErrorBanner` renders above `ChatComposer` and auto-dismisses after 6 s. `PromptForm` applies the same logic for the home-page flow, showing the message inline with the appropriate color.
- **Regenerate (start over)**: a **Regenerate** button sits in the right panel header of `ChatWorkspace`, aligned to the right of the Preview/Code tabs. Clicking it opens `RegenerateConfirmModal`. On confirmation, the original prompt (`chat.messages.find(m => m.role === 'user')?.content`) is written to `sessionStorage` under `REGENERATE_PROMPT_STORAGE_KEY` (from `shared/storage-keys.ts`) and the router navigates to `/`. `PromptForm` reads and clears that key in a `useEffect` on mount, seeding the textarea. The existing chat is not mutated or deleted — it remains accessible at its original URL. The button is disabled while `isLoading` or when no user message exists.
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
- **Root `pnpm test` delegates to backend unit tests** — runs `pnpm --filter backend test` under the hood. For e2e or coverage, use `pnpm --filter backend test:e2e` / `test:cov` explicitly.
- **`ChatsRepository` is in-memory** — all chat state lives in a `Map` and is lost when the backend restarts. A persistent store (DB) is a future concern.
- **No streaming** — endpoints return a full chat snapshot after the AI call completes. Generation can take 5–20 seconds depending on the model. Streaming (SSE or chunked) is a future improvement.
- **Missing shared configs**: no root `tsconfig.base.json`, no shared ESLint config, no root `.prettierrc`, no Dockerfile, no CI configuration. These should be introduced as the POC grows.
- **`Timestamp.tsx` ESLint warning** — the component calls `setState` synchronously inside `useEffect` (intentional SSR/hydration workaround). The `eslint-config-next` rule `react-hooks/set-state-in-effect` flags this as an error; the frontend `pnpm lint` fails because of this pre-existing issue. The warning is suppressed in the component with `// eslint-disable-next-line` if needed, or accepted as known tech debt.
- **`uuid` v14 is ESM-only** — the e2e Jest config (`test/jest-e2e.json`) needs `"transformIgnorePatterns": ["node_modules/\\.pnpm/(?!(uuid))"]` to transform the uuid package through ts-jest. This is already set; do not remove it.

## Intended direction

Phases 1 (scaffolding), 2 (real AI integration), 3 (edit flow with code-as-context), 4 (code inspection — Preview/Code tabs with syntax highlighting and copy-to-clipboard), 5 (version history — message timestamps, per-version preview, rollback with truncation and confirmation modal), 6 (unprocessable prompt handling — CANNOT_INTERPRET sentinel, HTTP 422, ephemeral error banner, generate-before-mutate ordering, `ApiErrorCode` constants), and 7 (regenerate — start-over button, `RegenerateConfirmModal`, `sessionStorage` prompt transport, `shared/storage-keys.ts`) are complete. Remaining next steps:

1. **Streaming**: stream the LLM response token-by-token via SSE or chunked transfer to improve perceived latency.
2. **Persistence**: replace `ChatsRepository`'s in-memory `Map` with a real database so chat history survives restarts.
3. **Dynamic assistant messages**: `AiProvider.generate()` already returns `assistantMessage` — wire it into the DTO mapper so the assistant bubble reflects actual LLM feedback instead of a canned string.
