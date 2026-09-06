# Morrow

[![CI](https://github.com/gocougs2020/morrow/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gocougs2020/morrow/actions/workflows/ci.yml)

Morrow is an opinionated but flexible workspace for [eve](https://eve.dev) AI agents. One deploy is one team workspace: files, sessions, memory, inbox, and usage are designed a certain way. Models, skills, connections, and instructions are yours to change.

Fork, configure, and deploy. Next.js web chat, Better Auth, Neon (or local SQLite), AI Gateway models, skills, memory, files, and scheduled jobs. Don’t wait for tomorrow—deploy today with Morrow.

MIT licensed. Current tag is **0.2.0** — bump `package.json` when you tag the next release. See [CHANGELOG.md](./CHANGELOG.md) if you forked and are pulling updates, plus [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md).

Product defaults live in **[`app.config.ts`](./app.config.ts)**. Secrets and who can sign in live in environment variables.

<p align="center">
  <img src="docs/screenshots/home.png" alt="Morrow home: skill chips and a /write prompt" width="880" />
</p>

<p align="center">
  <img src="docs/screenshots/session-canvas.png" alt="A session with a live HTML file canvas beside the chat" width="880" />
</p>

## Features

- Durable sessions with stable URLs (eve)
- First-prompt model routing (AI Gateway)
- Durable and scalable memory (sticky notes + embeddings)
- Voice-to-text input (gpt-transcribe from OpenAI)
- Native files storage (Vercel Blob; “Dropbox-lite”)
- Inbox for agent mail (send and receive via Resend)
- Built-in and user-authored skills (eve skills)
- Slash-command skill invoke (`/slug`)
- Scheduled jobs (eve schedules)
- Installable PWA (Add to Home Screen)
- Session file canvas (files beside the chat)
- Automatic context compaction (eve)
- User vs Account usage+cost dashboard (token and cost ledger)
- Related-session citations (embeddings)
- Custom instruction overlay (per-user, on top of agent instructions)
- Signup allowlist (env emails and domains)
- One-file product config (`app.config.ts`)

**How to hide the home setup screen.** Until you set `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS`, the home page is a setup checklist — locally and on the live site. Completing the other steps (secret, Gateway, Neon, Blob) does not dismiss it. Add your email or a company domain, restart `npm run dev` (or redeploy on Vercel), and that home-page checklist is gone. See [Lock who can sign in](#lock-who-can-sign-in). After you sign in, **Settings → Setup** still shows what’s left (voice, Inbox, and any unfinished host settings). To hide or delete that signed-in page, see [Remove the in-app setup page](#remove-the-in-app-setup-page).

## Quick start

**Deploy on Vercel** is the fastest path to a live workspace. Run it on your computer if you want to change the code first. Import the repo yourself if you already forked and do not want the Deploy button.

You need a [GitHub](https://github.com/signup) account and a [Vercel](https://vercel.com/signup) account (both free). About 10 minutes for the Deploy button.

**Settings files in one sentence.** Private values (passwords, API keys, who may sign in) are not stored in the public code. On your computer they go in a file named `.env.local`. On the live site they go in Vercel → your project → **Settings → Environment Variables**. The on-screen checklist watches those settings and checks off each step.

### Deploy on Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgocougs2020%2Fmorrow&project-name=morrow&repository-name=morrow&env=BETTER_AUTH_SECRET%2CBETTER_AUTH_URL%2CALLOWED_SIGNUP_EMAILS&envDescription=BETTER_AUTH_SECRET%3A+32%2B+random+characters.+BETTER_AUTH_URL%3A+your+live+origin+including+https%3A%2F%2F+%28https%3A%2F%2FYOUR-PROJECT.vercel.app%29.+ALLOWED_SIGNUP_EMAILS%3A+your+email+-+hides+the+setup+page+and+blocks+strangers+from+using+your+models.&envLink=https%3A%2F%2Fgithub.com%2Fgocougs2020%2Fmorrow%23environment-variables&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%2C%22allowConnectExistingProduct%22%3Atrue%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D)

The button copies this repo into your GitHub account and creates a Vercel project. The wizard asks you to type three values (it cannot fill secrets for you — they would sit in the browser history) and offers Neon plus private Blob:

| Name | What to type |
| --- | --- |
| `BETTER_AUTH_SECRET` | 32+ random characters. Treat it like a password; do not commit it. |
| `BETTER_AUTH_URL` | Your live origin, including `https://`. Use `https://YOUR-PROJECT.vercel.app` (the project name you pick, default `morrow`) or your custom domain. You can fix this in Settings after the first deploy if the URL is not known yet. |
| `ALLOWED_SIGNUP_EMAILS` | Your email. This hides the setup checklist and stops strangers from spending your model budget. |

Accept Neon and **private** Blob when offered. A linked Vercel project can call models with OIDC, so you do not have to paste `AI_GATEWAY_API_KEY` here.

After deploy, open the site URL. If you set `ALLOWED_SIGNUP_EMAILS`, create your account and you are in. If you skipped a store or an env field, finish [Import the repo yourself](#import-the-repo-yourself) and redeploy.

You can also deploy from a terminal after `npm install` — see [Deploy to Vercel](#deploy-to-vercel).

### Run it on your computer

1. **Node.js 24** — download the installer whose version starts with **24** from [nodejs.org](https://nodejs.org). This also installs `npm`.
2. **Git** (optional if you download a ZIP) — [git-scm.com/downloads](https://git-scm.com/downloads).

On a Mac, open **Terminal** (Applications → Utilities → Terminal). On Windows, open **Terminal** or **PowerShell**.

**Easiest:** open [github.com/gocougs2020/morrow](https://github.com/gocougs2020/morrow), click **Fork** (top right) so you have your own copy, then click the green **Code** button → **Download ZIP**. Unzip the folder. In Terminal, type `cd ` (with a space), drag the unzipped folder onto the window, and press Return.

**Or use Git** (replace `YOUR-USERNAME` with your GitHub name if you forked):

```bash
git clone https://github.com/gocougs2020/morrow.git
cd morrow
```

If you forked first, clone `https://github.com/YOUR-USERNAME/morrow.git` instead.

Then install and create your private settings file:

```bash
npm install
```

Mac / Linux:

```bash
cp .env.example .env.local
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

Start the app:

```bash
npm run dev
```

Leave that window open. Open [http://localhost:3000](http://localhost:3000) in your browser. You should see **Set up your workspace** — a checklist. Click **Refresh** on the page after you add a setting (if you edited `.env.local` yourself, press Ctrl+C in Terminal, run `npm run dev` again, then Refresh).

**Sign-in secret.** On the setup page, click **Generate secret**, then **Copy**. Click **Save to this computer**, or paste `BETTER_AUTH_SECRET=` plus the value into `.env.local`. Do not commit it.

**AI Gateway key.** The agent needs a Vercel AI Gateway key to call models locally.

1. Sign up at [vercel.com/signup](https://vercel.com/signup) if you do not have an account.
2. Create a key at [AI Gateway API keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys&title=Get%20your%20AI%20Gateway%20key).
3. In `.env.local`, put it on the `AI_GATEWAY_API_KEY=` line. Restart `npm run dev` and Refresh the checklist.

On a linked Vercel project, OIDC can replace this key.

Then [lock who can sign in](#lock-who-can-sign-in) so the checklist leaves the home page.

### Import the repo yourself

Use this if you forked and imported on [vercel.com/new](https://vercel.com/new) instead of the Deploy button. Skip any step the wizard already completed.

1. Fork [github.com/gocougs2020/morrow](https://github.com/gocougs2020/morrow) if you have not already.
2. Open [vercel.com/new](https://vercel.com/new), sign in with GitHub, and **Import** your fork. Deploy and copy the site URL (it looks like `https://something.vercel.app`).
3. In that Vercel project → **Settings → Environment Variables**, add at least:

   | Name | Value |
   | --- | --- |
   | `BETTER_AUTH_SECRET` | 32+ random characters |
   | `BETTER_AUTH_URL` | Your live URL, including `https://` |
   | `AI_GATEWAY_API_KEY` | Your Gateway key (skip if you rely on OIDC) |
   | `ALLOWED_SIGNUP_EMAILS` | Your email (or set `ALLOWED_SIGNUP_DOMAINS` instead) |

4. **Neon** — Storage → Create Database → Neon, or [Neon on the Vercel Marketplace](https://vercel.com/marketplace/neon). Vercel adds `DATABASE_URL`. The live site needs this so accounts and chats survive deploys. Locally a file under `.data/` is used instead.
5. **Blob** — Storage → Create → Blob, **private**. Vercel adds `BLOB_READ_WRITE_TOKEN`. Uploads and some memory notes need this on the live site.
6. Redeploy (Deployments → ⋯ → Redeploy) so those settings take effect.

The **Put the app on Vercel** checkbox on the setup page turns green when you open the live site (not localhost).

### Lock who can sign in

This is the only setting that removes the setup screen. Set **at least one** of:

- `ALLOWED_SIGNUP_EMAILS` — your address, or a comma-separated list (`you@example.com`)
- `ALLOWED_SIGNUP_DOMAINS` — the part after `@` (`yourcompany.com`)

Until one of those is set, the checklist stays on `/`, and anyone who finds the URL can create an account and spend your model budget.

- **On this computer:** enter your email on the last checklist item and click **Save and hide this page**. That writes `ALLOWED_SIGNUP_EMAILS` into `.env.local`. Or add the line yourself, stop the app, and run `npm run dev` again.
- **On Vercel:** skip this if you already entered it in the Deploy button wizard. Otherwise Settings → Environment Variables → add the same name and value, then redeploy.

After that, the setup page is gone. Open the site, create your account, and you are in.

Optional later: `OPENAI_API_KEY` for voice input, and the `RESEND_*` keys for Inbox — see [Environment variables](#environment-variables).

Signup, sign-in, transcription, and a few generate routes are rate-limited per server instance. That is a burst brake, not a global quota — the allowlist is the real spend control.

When you want to change the product name, home-page chips, or models, edit `app.config.ts` (details below). Do not put emails, domains, or API keys in that file. Restart or redeploy after you change it.

## After the first deploy

The **Set up your workspace** page on `/` stays up until `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS` is set in that environment (`.env.local` on your computer, Vercel env on the live site). Other completed checklist items do not hide it. Then the home page is signed-in chat.

Signed-in users can still open **Settings → Setup** (`/settings/setup`) to see remaining environment settings — voice (`OPENAI_API_KEY`), Inbox (`RESEND_*`), the Account usage allowlist, and any unfinished host steps. The page never prints secret values.

## Remove the in-app setup page

The signed-in checklist is optional after you are done configuring.

1. **Hide it** — set `setup.inAppPage` to `false` in [`app.config.ts`](./app.config.ts), then restart or redeploy. The route 404s and the Setup links disappear.
2. **Delete it from the repo** — remove `app/settings/setup/` and `components/workspace-setup.tsx`, drop the `setup` block from `app.config.ts` and `isInAppSetupEnabled` from `lib/in-app-setup.ts` (and its imports), and take the Setup links out of `components/app-header.tsx`, `components/settings-panel.tsx`, and `lib/app-nav.ts`.

Leave `lib/setup-status.ts` and the public checklist on `/` in place. Those still protect a fresh clone until the allowlist is set.

## What’s included

- Signed-in web chat at `/`, with sessions under `/s/[chatId]`
- Files you can edit, attach to a session, and share (uploads up to 15 MB; markdown, CSV, JSON, PDF, PNG, JPEG, WebP, GIF, and HTML)
- Inbox for mail the agent sends or receives through Resend, with search
- Built-in skills for work, home, and a couple of creative examples (research, writing, meeting prep, household plans, images, and more)
- Long-term sticky-note memory (Settings → Memory) and related-session citations
- Optional Resend send/receive. Add other services in `agent/connections/` if you need them.
- Custom instructions, sticky-note memory, and user-authored skills in Settings
- A Usage page with running session, turn, token, and cost totals — including by day
- Installable as a home-screen app on iPhone and Android (PWA). Push notifications are not enabled yet.

One Vercel project is one workspace. **Shared** files, skills, and schedules
are visible and editable by every signed-in account on that deployment.
**Public** adds an unguessable `/d/...` link on the internet. **Private**
is only you. This is not a multi-tenant SaaS — use allowlists if the URL is public.

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

Current defaults — a general starter kit (work, home, and a couple of creative examples). All enabled; intake, files, and memory are on but not suggested on the home page:

- `brainstorming`, `write`, `research`, `meeting-prep`, `plan`
- `image`, `household`, `story`, `decide`, `weekly-review`
- `intake`, `files`, `memory`

These are examples of procedures you can ship with eve, not a vertical product. Hide or replace any of them via `skills.<slug>.suggest` / `.enabled`, or add your own folder under `agent/skills/`.

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

### In-app setup page

```ts
setup: {
  inAppPage: true,
},
```

`true` shows **Settings → Setup**. `false` hides the page and its links without deleting files.

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

Copy `.env.example` to `.env.local` (local) or set the same keys on the Vercel project (production). The [Quick start](#quick-start) and the in-app checklist walk through the ones you need first.

### Access allowlist

Restrict who can create an account **and** keep a web session. Set these in `.env.local` locally, or on the Vercel project for production and preview. Do not put emails or domains in `app.config.ts` — that file is committed and compiled into the app.

**One of `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS` is required to hide the setup checklist.** Until then, `/` shows **Set up your workspace** instead of chat.

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
- When both allowlists are empty, the setup checklist stays on `/`, and anyone can sign up and stay signed in — except blocked emails.
- When an allowlist is set, an email that is not approved cannot create an account, sign in, or keep using an existing cookie. The next page or API request signs them out.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Auth cookie signing. Use a 32+ character random string. |
| `BETTER_AUTH_URL` | Yes | Public origin. Local default is `http://localhost:3000`. Production must be **your** canonical origin (set on the Vercel project, not in source). Clones and forks do not inherit a production host. Preview deploys also allow `*.vercel.app`. |
| `ALLOWED_SIGNUP_EMAILS` | One of these two | Comma-separated emails allowed to sign up and stay signed in. Setting this or `ALLOWED_SIGNUP_DOMAINS` hides the setup checklist. |
| `ALLOWED_SIGNUP_DOMAINS` | One of these two | Comma-separated domains allowed to sign up and stay signed in. Setting this or `ALLOWED_SIGNUP_EMAILS` hides the setup checklist. |
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

The [Deploy on Vercel](#deploy-on-vercel-recommended) button in Quick start is the usual path: it prompts for env vars and offers Neon plus private Blob. Importing a fork yourself is under [Import the repo yourself](#import-the-repo-yourself). From a terminal after `npm install`:

```bash
npx eve deploy --non-interactive --yes --project your-project-name
```

Or link first, then deploy:

```bash
npx eve link --non-interactive --project your-project-name
npx eve deploy --non-interactive --yes
```

Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your production URL — each clone or fork must set its own), and `DATABASE_URL` on the project before the first production login. Production auth trusts that origin plus localhost; it does not allow every `*.vercel.app` host. Preview deployments still accept the Vercel wildcard. Add Blob (`BLOB_READ_WRITE_TOKEN`) so files and sticky-note memory persist across deploys. Set `ALLOWED_SIGNUP_EMAILS` and/or `ALLOWED_SIGNUP_DOMAINS` on the project (not in `app.config.ts`) so the setup checklist leaves the home page and only those people can sign up or stay signed in. Optionally add `BLOCKED_ACCESS_EMAILS`. To show the Account usage tab to specific people, set `ALLOWED_ACCOUNT_USAGE_EMAILS`.

To let the agent email reports or receive mail, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, enable receiving on a Resend domain, and point a webhook at `https://your-app.vercel.app/api/webhooks/resend` for `email.received`. Store the signing secret as `RESEND_WEBHOOK_SECRET`. Events for other addresses on the same Resend account are ignored unless they match `RESEND_FROM_EMAIL`, `RESEND_INBOUND_ADDRESSES`, or `RESEND_INBOUND_DOMAINS`. Inbound mail from the signed-in user's address is classified; action items open an email-sourced session.

Pushing to a Git-connected Vercel project also deploys. Changing `app.config.ts` requires a new deploy — it is compiled into the app, not read at request time from the host disk.

HTML responses send a Content-Security-Policy plus `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` from `next.config.ts`. This repo does not set HSTS so localhost stays usable; on a custom HTTPS domain, add `Strict-Transport-Security` at the host (Vercel / your CDN), not for `next dev`.

## Customize the agent beyond the config file

| What you want | Where to edit |
| --- | --- |
| Who can sign up or stay signed in (also hides the setup screen) | `.env.local` / Vercel env (`ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS`; optional `BLOCKED_ACCESS_EMAILS`) |
| Who can see Account usage | `.env.local` / Vercel env (`ALLOWED_ACCOUNT_USAGE_EMAILS`) |
| Hide the signed-in setup page | `app.config.ts` (`setup.inAppPage`) |
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
app.config.ts          # Brand, home copy, skills, models, in-app setup flag
app/                   # Next.js App Router (chat, files, inbox, settings, auth)
agent/                 # eve agent: instructions, tools, skills, connections
lib/                   # Shared store, files, auth, helpers
components/            # UI
docs/screenshots/      # README previews
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
| `npm run typecheck` | `tsc --noEmit`. Includes `agent/tools`, `lib`, and `agent/skills/user.ts`. Skill procedure folders are markdown (`SKILL.md`), not part of the TS program. |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Vitest unit tests |
| `npm run eval` | `eve eval`. Workspace cases in `evals/` (answer-first, no invented prices, memory vs file). Needs `AI_GATEWAY_API_KEY` (same as `npm run dev`). Skill evals under `agent/skills/*/evals` remain for those skills. |
