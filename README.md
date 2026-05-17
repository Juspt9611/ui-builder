# ui-builder

A proof-of-concept V0/Lovable-style UI generator. You describe what you want in plain English; the system calls an AI layer, receives a complete self-contained HTML application, and renders it live inside a sandboxed iframe. Follow-up prompts refine the running app in place — the current HTML is passed back to the LLM as context on every edit. The session also supports per-version preview, rollback to any prior version (with a confirmation prompt before discarding later turns), and a start-over flow that seeds the home form with the original prompt.

---

## Stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS 11 (Express adapter) |
| Backend language | TypeScript 5.7 |
| Backend config | `@nestjs/config` — reads `.env`, global `ConfigService` |
| Backend validation | `class-validator` + `class-transformer` (global `ValidationPipe`) |
| Backend IDs | `uuid` v14 |
| Backend testing | Jest 30 + Supertest (e2e) |
| Backend AI | OpenRouter REST API via Node 22 native `fetch` (no SDK) |
| Frontend framework | Next.js 16.2.6 — App Router |
| Frontend language | TypeScript 5 |
| Frontend UI | React 19.2.4 |
| Frontend styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Frontend HTTP | Native `fetch` (no axios / SWR / react-query) |
| Frontend state | Plain `useState` (no Zustand / Redux) |
| Frontend syntax highlighting | `highlight.js` — core + `xml` language only |
| Package manager | pnpm workspaces |
| Linting | ESLint 9 flat config (each app independently) |
| Formatting | Prettier 3 (backend only) |

---

## Repo layout

```
ui-builder/
├── apps/
│   ├── backend/              # NestJS API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── ai/       # abstract AiProvider, OpenRouter + mock implementations
│   │       │   └── chats/    # REST endpoints, in-memory repository, entity/DTO split
│   │       └── main.ts
│   └── frontend/             # Next.js App Router — port 3000
│       ├── app/
│       │   ├── page.tsx      # home route — PromptForm
│       │   └── chat/[id]/    # chat route — ChatWorkspace + iframe preview
│       ├── components/
│       ├── services/         # fetch wrappers, API error codes, backend URL config
│       ├── shared/           # client-side storage key constants
│       └── types/
├── package.json              # root pnpm workspace scripts
└── pnpm-workspace.yaml
```

---

## Installation

Node 22 is required — the backend uses Node's built-in `fetch` with no polyfill.

```bash
# from repo root
pnpm install

# copy backend env file and fill in values (see Environment variables below)
cp apps/backend/.env.example apps/backend/.env
```

---

## Running locally

Open two terminals from the repo root:

```bash
# terminal 1
pnpm dev:backend    # → http://localhost:3001

# terminal 2
pnpm dev:frontend   # → http://localhost:3000
```

### Per-app scripts

Run from the repo root with `pnpm --filter <app> <script>`, or from inside the app directory with `pnpm <script>`.

**Backend** (`apps/backend`):

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

**Frontend** (`apps/frontend`):

| Script | What it does |
|---|---|
| `dev` | Next.js dev server |
| `build` | Next.js production build |
| `start` | Serve production build |
| `lint` | ESLint via `eslint-config-next` |

> **Note:** The root `pnpm test` is a placeholder and always exits 1. Run tests per-app: `pnpm --filter backend test` or `pnpm --filter backend test:e2e`.

---

## Environment variables

### Backend — `apps/backend/.env`

See [`apps/backend/.env.example`](apps/backend/.env.example) for the full template.

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | Backend listen port |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | No | Allowed CORS origin |
| `AI_PROVIDER` | `mock` | No | `mock` or `openrouter` |
| `OPENROUTER_API_KEY` | — | When `openrouter` | Your OpenRouter API key (`sk-or-v1-…`) |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` | No | Any model slug from openrouter.ai/models |
| `OPENROUTER_SITE_URL` | — | No | Sent as `HTTP-Referer` header to OpenRouter |
| `OPENROUTER_APP_NAME` | — | No | Sent as `X-Title` header to OpenRouter |

### Frontend — `apps/frontend/.env.local` (optional)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Backend base URL; override when deploying |

---

## AI provider switch

The AI layer is controlled by `AI_PROVIDER` in `.env`. `AiModule` is a dynamic NestJS module (`AiModule.forRoot()`) that reads the env value at DI resolution time and registers only the chosen implementation — the unused provider is never instantiated.

| `AI_PROVIDER` | Provider | Behavior |
|---|---|---|
| `mock` (default) | `MockAiProvider` | Returns hardcoded "Hello World" HTML. Prompt containing `__cannot__` triggers a 422 Unprocessable Entity — useful for testing the error UX without an API key. |
| `openrouter` | `OpenRouterAiProvider` | Calls the OpenRouter REST API; returns real LLM-generated HTML. |

To switch to OpenRouter, set `AI_PROVIDER=openrouter` and supply `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `apps/backend/.env`.

---

## Technical decisions

- **Monorepo with pnpm workspaces** — a single `pnpm install` wires both apps; lint and tests remain isolated per app; the workspace boundary makes it easy to add a shared package later.

- **Abstract `AiProvider` + dynamic `AiModule.forRoot()`** — `ChatsService` depends only on the abstract token; swapping mock → real LLM is a one-line env change with no consumer edits. Only the chosen provider is instantiated, avoiding accidental OpenRouter calls in test runs.

- **In-memory `ChatsRepository`** — deliberate POC trade-off. A `Map<string, Chat>` keeps the surface minimal and the project runnable without a database. Persistence is the clearest next step.

- **Entity / DTO split** — the persistence entity (`chat.entity.ts`) stores only user turns (no `role` field). `ChatsService.toChatResponseDto()` fabricates the assistant counterpart on every read, so the HTTP shape is always a clean user/assistant pair without polluting the store.

- **Three-layer LLM output hardening** — raw model output passes through: (1) a sentinel check (`CANNOT_INTERPRET: <reason>` → HTTP 422, nothing persisted), (2) `extractHtmlDocument` for structural validation (pure HTML, markdown-fence fallback, preamble fallback), and (3) `sanitizeRemoteUrls` which replaces any image URL not in the allowlist (`picsum.photos`, `placehold.co`) with a safe placeholder. This sequence is defensive against both bad prompts and inconsistent model output.

- **Generate-before-mutate for rollbacks** — when a user edits from an older version (`fromMessageId`), the AI call must succeed before `ChatsRepository.truncateAfter` runs. A 422 or any generation error leaves the repository untouched, preventing a lost-state scenario.

- **Sandboxed iframe preview** — `<iframe srcDoc={code} sandbox="allow-scripts">` lets the generated page run its own JavaScript while blocking navigation, form submissions, popups, and same-origin access. The system prompt further bans `fetch`, `XMLHttpRequest`, WebSockets, `eval`, `document.write`, and external CDN URLs.

- **Native `fetch` everywhere** — no third-party HTTP client on the frontend or backend. This keeps the dependency tree small and relies on the Node 22 / browser primitives that ship with the runtime.

---

## How the generated code is rendered

1. **AI generation** — The LLM (or mock) is given a system prompt that mandates returning a single, complete `<!DOCTYPE html>` document with all CSS and JS inline. No external scripts, no CDN, no API calls from the page.

2. **Backend hardening** — The raw model response is processed in sequence:
   - **Sentinel check**: if the response starts with `CANNOT_INTERPRET: <reason>`, an `UnprocessablePromptException` (HTTP 422) is thrown immediately; nothing is stored.
   - **`extractHtmlDocument`**: validates the response is a real HTML document; handles markdown fence and preamble edge cases from inconsistent models.
   - **`sanitizeRemoteUrls`**: scans the full HTML string with a single regex and replaces any absolute URL whose host is not `picsum.photos` or `placehold.co` with a safe placeholder.

3. **Persistence** — The sanitized HTML is stored in `message.code` on the user turn in `ChatsRepository`.

4. **HTTP response** — The full chat (including the new code) is returned from the endpoint as a DTO.

5. **iframe preview** ([`CodePreview.tsx`](apps/frontend/app/chat/components/CodePreview.tsx)) — The frontend renders the HTML string directly as:
   ```tsx
   <iframe srcDoc={code} sandbox="allow-scripts" />
   ```
   No build step, no transpilation, no extra runtime — the browser runs the document as-is.

6. **Code viewer** ([`CodeViewer.tsx`](apps/frontend/app/chat/components/CodeViewer.tsx)) — A segmented control (Preview / Code) in the right panel switches to a syntax-highlighted read-only view powered by `highlight.js`, with a one-click copy button.

7. **Version history** — Every user turn retains its `code`. `ChatWorkspace` tracks a `selectedUserMessageId` that controls which version the preview and code viewer display. Selecting an older version and sending a new prompt triggers a rollback: later turns are discarded (after confirmation) and the selected version's code is fed back to the LLM as context.

---

## Known limitations

- **In-memory storage** — all chat state is lost when the backend process restarts.
- **No streaming** — the endpoint blocks until the full LLM response arrives.
- **No authentication** — any client with a chat id can read and extend that chat.
- **Mock provider is minimal** — it returns the same "Hello World" page for every prompt; only the `__cannot__` sentinel and the error UX can be exercised without an OpenRouter key.
- **Free OpenRouter models** — free-tier models can be rate-limited, slow, or temporarily unavailable; failures surface as generic error banners.
- **No CI / no Dockerfile** — no automated test pipeline or container image.

---

## What I'd improve with more time

1. **Streaming** — stream the LLM response token-by-token via SSE or chunked transfer to eliminate the blank-screen wait and give instant visual feedback.
2. **Persistence** — replace `ChatsRepository`'s `Map` with Postgres or SQLite (via Prisma or Drizzle), add schema migrations, and keep chat history across restarts.
3. **Dynamic assistant messages** — `AiProvider.generate()` already returns `assistantMessage`; wire it into `ChatsService.toChatResponseDto()` so the assistant bubble reflects actual model feedback instead of a canned string.
4. **Auth & multi-user** — add a lightweight auth layer (JWT or session cookie), scope chats to owners, and generate shareable read-only links.
5. **DOMPurify sanitization** — add a second sanitization pass on the HTML before persisting it (defense-in-depth on top of the URL allowlist and iframe sandbox).
6. **CI** — GitHub Actions running lint + unit + e2e tests, plus a smoke render against the mock provider on every PR.
7. **Observability** — structured logging (NestJS Logger → JSON) and basic metrics for prompt latency, 422 rate, and model errors.
8. **Visual regression tests** — Playwright screenshot comparison of the generated iframe across known prompts to catch unintended regressions in the render pipeline.
