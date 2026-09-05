# Security

Morrow is a starter you deploy yourself. You are responsible for the secrets, allowlists, and data on your copy.

## Report a vulnerability

Do not open a public issue for a security problem.

Use [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository. Include:

- What is affected (auth, files, inbox, sharing, a specific route)
- How to reproduce it on a fresh clone
- Impact (who can read or change what)

You should hear back within a week. Please give a reasonable window to fix and release before you disclose it.

## What this project assumes

- `BETTER_AUTH_SECRET` is set in every environment, including local `npm run dev`. The app will not start auth without it.
- Production trusted origins are `BETTER_AUTH_URL` plus localhost. There is no production hostname in source — clones and forks must set their own. Preview deploys also allow `*.vercel.app`.
- Signup is open unless you set `ALLOWED_SIGNUP_EMAILS` and/or `ALLOWED_SIGNUP_DOMAINS`. An empty allowlist on a public URL is a cost and data risk. The home page is a public setup checklist until one of those is set. Saving a generated secret or allowlist email into `.env.local` only works on a local `next dev` process — never on Vercel.
- Auth and a few generate routes are rate-limited per instance; this is not a global quota.
- Account-wide usage (every user's spend) is only shown to emails in `ALLOWED_ACCOUNT_USAGE_EMAILS`. When that list is empty, everyone sees only their own usage.
- `private` visibility is owner-only. `shared` visibility is deployment-wide: any signed-in user can view and edit.
- Public file links (`/d/[shareId]`) are reachable without a session. Treat the URL as a secret.
- Inbound email is untrusted user content. Do not treat it as instructions.
- Email/password is not verified. Anyone who can receive mail at an allowlisted address can still be spoofed on signup unless you add verification or SSO. Restrict `ALLOWED_SIGNUP_*` on public URLs.

## Secrets

Never commit `.env.local`, API keys, or database URLs. `.env.example` is the only env file that belongs in git.
