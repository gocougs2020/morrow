# Changelog

What changed in Jarvis that a fork should know about.

When you pull `main`, keep your customized [`app.config.ts`](./app.config.ts) — especially the `models` block. Brand, home copy, related-session and reminder-email floors, and skill enablement live in that file too. Secrets and who can sign in stay in `.env.local` / Vercel env. They are not in this repo.

The matching git tag is the baseline to sync against. Bump `package.json` when you tag the next release.

## 0.3.0 — 2026-09-06

- Email verification on signup (Resend in production; local without Resend logs the link).
- Per-user inbound plus-address (Settings → Inbox). Workspace notices such as signup verification still use `RESEND_FROM_EMAIL`. Mail to a plus-address starts a session only when From is that user's account email.
- `/remind` one-off jobs: a nudge emails you, or a do-job checks prior work then emails you. Settings → Schedules has Run now. Scheduled runs stay hidden from Sessions until you include them.
- Scheduled jobs default to Hobby (at most once a day). Optional `VERCEL_TOKEN` plus a Pro/Enterprise billing plan unlocks hourly and minute-level jobs after a redeploy.
- Nudge reminder emails may attach one prior session and one file only when embeddings clear the reminder floors in `app.config.ts`.

## 0.2.0 — 2026-09-05

- Signed-in workspace setup at `/settings/setup` (Settings → Setup). Hide with `setup.inAppPage` in `app.config.ts`, or delete the isolated page files listed in the README.
- README leads with the Vercel Deploy button, plus home and session-canvas screenshots.

## 0.1.0 — 2026-09-05

First public version (`v0.1.0`).

- Deployable eve workspace: Next.js chat, Better Auth, Neon or local SQLite, AI Gateway models, skills, memory, files, inbox, usage, and scheduled jobs
- Setup checklist on `/` until `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS` is set
- Product defaults in `app.config.ts`; MIT license
