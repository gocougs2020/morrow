# Changelog

What changed in Morrow that a fork should know about.

When you pull `main`, keep your customized [`app.config.ts`](./app.config.ts) — especially the `models` block. Brand, home copy, memory thresholds, and skill enablement live in that file too. Secrets and who can sign in stay in `.env.local` / Vercel env. They are not in this repo.

The matching git tag is the baseline to sync against. Bump `package.json` when you tag the next release.

## 0.2.0 — 2026-09-05

- Signed-in workspace setup at `/settings/setup` (Settings → Setup). Hide with `setup.inAppPage` in `app.config.ts`, or delete the isolated page files listed in the README.
- README leads with the Vercel Deploy button, plus home and session-canvas screenshots.

## 0.1.0 — 2026-09-05

First public version (`v0.1.0`).

- Deployable eve workspace: Next.js chat, Better Auth, Neon or local SQLite, AI Gateway models, skills, memory, files, inbox, usage, and scheduled jobs
- Setup checklist on `/` until `ALLOWED_SIGNUP_EMAILS` or `ALLOWED_SIGNUP_DOMAINS` is set
- Product defaults in `app.config.ts`; MIT license
