# Morrow

A deployable workspace for [eve](https://eve.dev) agents. Fork, configure, and deploy. Next.js web chat, Better Auth, Neon (or local SQLite), AI Gateway models, skills, memory, files, and scheduled jobs. Don’t wait for tomorrow—deploy with Morrow

MIT licensed. See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md).

Product defaults live in **[`app.config.ts`](./app.config.ts)**. Secrets and who can sign in live in environment variables.

## Quick start

You need **Node.js 24** and **npm 11** (this repo pins `packageManager`).

```bash
git clone https://github.com/gocougs2020/morrow.git
cd morrow
npm install
cp .env.example .env.local
```

Edit `.env.local` and set at least these three:

```bash
# Required. The app will not start auth without this.
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000

# Required locally. On Vercel, a linked project can use OIDC instead.
AI_GATEWAY_API_KEY=your_gateway_key
```

Before you deploy a public URL, set `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS`.
An empty allowlist lets anyone create an account and spend your model budget.

```bash
ALLOWED_SIGNUP_EMAILS=you@example.com
# ALLOWED_SIGNUP_DOMAINS=example.com
# BLOCKED_ACCESS_EMAILS=former@example.com
# ALLOWED_ACCOUNT_USAGE_EMAILS=you@example.com
```

Signup, sign-in, transcription, and a few generate routes are rate-limited per server instance. That is a burst brake, not a global quota — allowlists are the real spend control for chat.

Then configure the product in `app.config.ts`:

| Edit | Where |
| --- | --- |
| Name and tagline | `brand.name`, `brand.tagline` |
| Home prompt placeholders | `home.*` |
| Which built-in skills show | `skills.<slug>.enabled` / `.suggest` |
| Model IDs | `models.*` |
| Agent voice and workflows | `agent/instructions.md` |

Do not put emails, domains, or API keys in `app.config.ts`. Restart after you change that file.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Sign up** → use the home composer. `npm run dev` starts Next.js and the eve runtime together.

Voice input also needs `OPENAI_API_KEY`. Production needs `DATABASE_URL` (Neon) and `BLOB_READ_WRITE_TOKEN` (Vercel Blob). Inbox needs the `RESEND_*` keys — see [Environment variables](#environment-variables).

## What’s included

- Signed-in web chat at `/`, with sessions under `/s/[chatId]`
- Files you can edit, attach to a session, and share
- Inbox for mail the agent sends or receives through Resend, with search
- Built-in skills (intake, research, plans, quotes, writing, images, and more)
- Long-term sticky-note memory (Settings → Memory) and related-session citations
- Optional Resend send/receive. Add other services in `agent/connections/` if you need them.
- Custom instructions, sticky-note memory, and user-authored skills in Settings
- A Usage page with running session, turn, token, and cost totals — including by day
- Installable as a home-screen app on iPhone and Android (PWA). Push notifications are not enabled yet.

On iPhone, open the site in Safari, tap Share, then **Add to Home Screen**. On Android Chrome, use **Install app** from the browser menu. Production must be HTTPS. The first production visit registers a service worker that caches static assets only — chat, auth, and API traffic stay on the network.

For the eve TUI only: `npm run dev:eve`.

## Configure the product (`app.config.ts`)

This is the file to change after you deploy a copy of the repo. Values below are the current defaults.

### Brand and home page

```ts
brand: {
  name: "Morrow",
  tagline: "A deployable workspace for eve agents. Don’t wait for tomorrow—deploy with Morrow",
},
home: {
  promptPlaceholder: "Ask anything...",
  followUpPlaceholder: "Ask a follow-up…",
},
```

`name` is the header, auth screens, shared-file footer, and browser title. `tagline` is the home page description and the HTML meta description.

### Built-in skills

Each key matches a folder under `agent/skills/<slug>/`.

| Field | Meaning |
| --- | --- |
| `enabled` | `false` hides the skill from the home page and Settings, and tells the agent not to load it |
| `suggest` | `true` shows a suggestion chip on the home page |
| `title` / `emoji` | Chip label; clicking inserts `/slug` into the prompt |

Current defaults — all enabled; files and memory are on but not suggested on the home page:

- `lead-intake`, `consultation-prep`, `research`, `proposal`, `quote-management`
- `text-to-image`, `write-rewrite`, `cold-email`, `copywriting`, `brainstorming`
- `files`, `memory`

To turn one off:

```ts
research: {
  enabled: false,
  suggest: false,
  // ...
},
```

To add a default skill, create `agent/skills/<slug>/SKILL.md` and add a matching entry here. To remove a skill from the agent entirely, delete its folder under `agent/skills/` as well.

Do not copy coding-agent or library skills (`ai-elements`, `streamdown`, `ai-sdk`, `agent-browser`, `web-design-guidelines`) into `agent/skills/`. Eve advertises every skill on every turn; those packages are large and are not end-user workflows.

Users can still create their own skills in Settings; those are per-account and are not listed in this file.

### Models

Chat IDs are AI Gateway strings (`provider/model`). On the first prompt of a session, `chatFast` classifies whether thinking is needed and picks one chat model for the whole session (so later turns can reuse the prompt cache). Simple prompts stay on `chatFast` with no forced reasoning. Analysis, live/real-world data, or prompts that would benefit from thinking use `chatLow` with high reasoning. Unusually complex prompts use `chatHigh` with high reasoning.

| Key | Used for | Default |
| --- | --- | --- |
| `chatFast` | Quick answers and first-prompt routing | `openai/gpt-5.6-luna-fast` |
| `chatLow` | First prompts that need analysis or thinking | `openai/gpt-5.6-luna` |
| `chatHigh` | First prompts that look unusually complex | `openai/gpt-5.6-sol` |
| `instructions` | Generating instruction overlays and custom skills | `openai/gpt-5.6-luna` |
| `sessionTitle` | Recents list titles and descriptions | `openai/gpt-5.6-luna` |
| `sessionMemory` | Related-session recall | `openai/gpt-5.6-luna` |
| `compaction` | Context-window checkpoints | `openai/gpt-5.6-luna` |
| `embeddings` | Session, file, and inbox email embeddings | `openai/text-embedding-3-small` |
| `imageGeneration` | `generate_image` | `openai/gpt-image-2` |
| `transcription` | Voice input (OpenAI Audio API) | `gpt-transcribe` |

If you change a chat model ID, add its context window under `models.contextWindows` (tokens). Unknown IDs fall back to `1_050_000`. Compaction and the session context chip use `min(256_000, 90% of that catalog size)` so a million-token model does not fill its full window.

### Related-session memory

```ts
memory: {
  relatedSessionLimit: 8,
  relatedSessionMinScore: 0.55,
  hydeTimeoutMs: 500,
},
```

HyDE (a hypothetical reply used only for retrieval) is aborted after `hydeTimeoutMs`. Recall then searches with whatever query embeddings are ready — usually just the prompt — and continues the turn with no related sessions if nothing ranks above `relatedSessionMinScore`.

On Neon, related-session search uses pgvector HNSW top-K (cosine) instead of loading every stored embedding into the app. Local JSON fallback still scores in process.

### Usage and cost

The session context chip shows the locked chat model, current context fill, compaction count, and a running session cost. Usage lives on **Usage** (not Settings). **You** is that signed-in user's sessions, turns, tokens, and cost. **Account** rolls every user's ledger into the same totals, plus a per-person cost breakdown. The Account tab is first, and only emails in `ALLOWED_ACCOUNT_USAGE_EMAILS` see it. Everyone else sees only their own usage.

Costs use the catalog in `lib/model-prices.ts` (OpenAI list rates, including cache and long-context tiers). Chat and compaction steps also use provider `costUsd` when the stream reports it. The ledger includes routing, titles, related-session memory, embeddings, instruction generation, transcription, image generation, inbound-email action classification, and Exa web search (`$7` / 1k searches via AI Gateway) — not only the visible chat turns.

Sessions are unique conversations. Turns are unique user/agent exchanges (a turn can make several model calls plus searches). Model calls exclude web search; search is a separate per-request fee.

Not in this ledger: Vercel hosting/functions, Neon compute and storage, Vercel Blob for files, and Resend delivery. Those are platform or vendor bills, not token-metered model calls.

## Environment variables

Copy `.env.example` to `.env.local` (local) or set the same keys on the Vercel project (production).

### Access allowlist

Restrict who can create an account **and** keep a web session with environment variables. Set them in `.env.local` locally, or on the Vercel project for production and preview. Do not put emails or domains in `app.config.ts` — that file is committed and compiled into the app.

```bash
ALLOWED_SIGNUP_EMAILS=ada@agency.com,sam@agency.com
ALLOWED_SIGNUP_DOMAINS=agency.com
BLOCKED_ACCESS_EMAILS=former.colleague@agency.com
ALLOWED_ACCOUNT_USAGE_EMAILS=ada@agency.com
```

- `ALLOWED_SIGNUP_EMAILS` is an exact match (case-insensitive), comma-separated.
- `ALLOWED_SIGNUP_DOMAINS` is the part after `@` — `agency.com` or `@agency.com` both work.
- `BLOCKED_ACCESS_EMAILS` always deny, even if the domain is allowed. Use this to revoke someone who already signed up.
- `ALLOWED_ACCOUNT_USAGE_EMAILS` is an exact match (case-insensitive), comma-separated. Those emails see the Account usage tab (all users' spend). When empty, only You is shown.
- When both allowlists are empty, anyone can sign up and stay signed in — except blocked emails.
- When an allowlist is set, an email that is not approved cannot create an account, sign in, or keep using an existing cookie. The next page or API request signs them out.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Auth cookie signing. Use a 32+ character random string. |
| `BETTER_AUTH_URL` | Yes | Public origin, e.g. `http://localhost:3000` or `https://your-app.vercel.app` |
| `ALLOWED_SIGNUP_EMAILS` | Optional | Comma-separated emails allowed to sign up and stay signed in |
| `ALLOWED_SIGNUP_DOMAINS` | Optional | Comma-separated domains allowed to sign up and stay signed in |
| `BLOCKED_ACCESS_EMAILS` | Optional | Comma-separated emails that cannot sign up or keep a session |
| `ALLOWED_ACCOUNT_USAGE_EMAILS` | Optional | Comma-separated emails that can see the Account usage tab |
| `RATE_LIMIT_DISABLED` | Local only | Set to `1` to skip the in-process limiter during soak tests. Ignored in production. |
| `AI_GATEWAY_API_KEY` | Local | AI Gateway. On Vercel, OIDC from the linked project can replace this. |
| `OPENAI_API_KEY` | For voice | Transcription via `gpt-transcribe` |
| `DATABASE_URL` | Production | Neon Postgres. Unset locally → SQLite + `.data/app.json` |
| `BLOB_READ_WRITE_TOKEN` | Production | Vercel Blob for private files and file memory. Local fallback is `.data/blobs/` |
| `RESEND_API_KEY` | For Inbox | Send and receive mail. Get a key at [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_WEBHOOK_SECRET` | For inbound | Signing secret from Resend → Webhooks (`email.received`) |
| `RESEND_FROM_EMAIL` | For send | Verified `From` address, e.g. `Morrow <agent@yourdomain.com>`. Inbound mail must be addressed here (or the inbound allowlist) or it is ignored. |
| `RESEND_INBOUND_ADDRESSES` | Optional | Extra inbound addresses, comma-separated. Use when receive is not the From address. |
| `RESEND_INBOUND_DOMAINS` | Optional | Extra inbound domains, comma-separated. Any local-part on those domains is accepted. |
| `MSB_HOME` | Recommended | Keep `.eve/msb-home` so this project’s microsandbox state stays isolated |

## Deploy to Vercel

```bash
npx eve deploy --non-interactive --yes --project your-project-name
```

Or link first, then deploy:

```bash
npx eve link --non-interactive --project your-project-name
npx eve deploy --non-interactive --yes
```

Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your production URL), and `DATABASE_URL` on the project before the first production login. Add Blob (`BLOB_READ_WRITE_TOKEN`) so files and sticky-note memory persist across deploys. To restrict who can create an account or stay signed in, set `ALLOWED_SIGNUP_EMAILS` and/or `ALLOWED_SIGNUP_DOMAINS` (and optionally `BLOCKED_ACCESS_EMAILS`) on the project — not in `app.config.ts`. To show the Account usage tab to specific people, set `ALLOWED_ACCOUNT_USAGE_EMAILS`.

To let the agent email reports or receive mail, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, enable receiving on a Resend domain, and point a webhook at `https://your-app.vercel.app/api/webhooks/resend` for `email.received`. Store the signing secret as `RESEND_WEBHOOK_SECRET`. Events for other addresses on the same Resend account are ignored unless they match `RESEND_FROM_EMAIL`, `RESEND_INBOUND_ADDRESSES`, or `RESEND_INBOUND_DOMAINS`. Inbound mail from the signed-in user's address is classified; action items open an email-sourced session.

Pushing to a Git-connected Vercel project also deploys. Changing `app.config.ts` requires a new deploy — it is compiled into the app, not read at request time from the host disk.

HTML responses send a Content-Security-Policy plus `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` from `next.config.ts`. This repo does not set HSTS so localhost stays usable; on a custom HTTPS domain, add `Strict-Transport-Security` at the host (Vercel / your CDN), not for `next dev`.

## Customize the agent beyond the config file

| What you want | Where to edit |
| --- | --- |
| Who can sign up or stay signed in | `.env.local` / Vercel env (`ALLOWED_SIGNUP_EMAILS`, `ALLOWED_SIGNUP_DOMAINS`, `BLOCKED_ACCESS_EMAILS`) |
| Who can see Account usage | `.env.local` / Vercel env (`ALLOWED_ACCOUNT_USAGE_EMAILS`) |
| Identity, tone, and default workflows | `agent/instructions.md` |
| Per-user overlay (working style) | Settings → Instructions, or the Settings prompt |
| Built-in skill steps | `agent/skills/<slug>/SKILL.md` |
| Tools, connections, schedules | `agent/tools/`, `agent/connections/`, `agent/schedules/` |
| Intake briefs, quotes, plans, decisions | Files (`create_document`) or sticky-note memory — not dedicated Neon tables |
| Custom domain tables (your fork) | `lib/db/schema.ts`, `lib/store-pg.ts` / `lib/store-json.ts`, and a tool under `agent/tools/` |
| Industry-specific behavior | Custom skills + the instruction overlay — not a second hardcoded identity |

After a content-only instructions or skill change, restart `npm run dev` (or redeploy) so eve reloads the agent.

## Project layout

```
app.config.ts          # Brand, home copy, skills, models
app/                   # Next.js App Router (chat, files, inbox, settings, auth)
agent/                 # eve agent: instructions, tools, skills, connections
lib/                   # Shared store, files, auth, helpers
components/            # UI
.env.example           # Environment variable template
LICENSE                # MIT
```

Local data (when `DATABASE_URL` is unset) lives under `.data/` and is gitignored.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js + eve |
| `npm run dev:eve` | eve TUI |
| `npm run build` | Next.js production build |
| `npm run deploy` | `eve deploy` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
