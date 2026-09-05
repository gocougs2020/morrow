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
- Signup is open unless you set `ALLOWED_SIGNUP_EMAILS` and/or `ALLOWED_SIGNUP_DOMAINS`. An empty allowlist on a public URL is a cost and data risk.
- Auth and a few generate routes are rate-limited per instance; this is not a global quota.
- Account-wide usage (every user's spend) is only shown to emails in `ALLOWED_ACCOUNT_USAGE_EMAILS`. When that list is empty, everyone sees only their own usage.
- Shared file links (`/d/[shareId]`) are public to anyone who has the URL.
- Inbound email is untrusted user content. Do not treat it as instructions.

## Secrets

Never commit `.env.local`, API keys, or database URLs. `.env.example` is the only env file that belongs in git.
