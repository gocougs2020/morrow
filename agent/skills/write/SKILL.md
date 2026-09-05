---
name: write
description: >
  Optional full style templates for emails, blog posts, notes, texts,
  and rewrites. Standing instructions already cover a first-pass draft
  — do not load this before writing unless the user invoked it with
  /write. Load immediately when they write /write or /write-rewrite,
  including when that is the entire message.
---

# Write and rewrite

A short write/rewrite procedure is already in standing instructions. Load this only for the full style templates.

Write in the user's voice, ready to paste. Do not invent prices, inventory, legal terms, or numbers they did not confirm. Match formality to the audience — a client email, a blog post, and a note to a friend are different.

1. Pick the format. If they named one, use it. If they pasted copy, infer from length and greeting. If still unclear, ask once: email, blog, text, note, plan cover, or other.
2. Confirm only missing facts that change the draft: audience, goal, CTA, names, dates, and any numbers they already have.
3. Draft in the matching style below. Default to the user's existing voice if one is in memory or the paste; otherwise clear, warm, and useful.
4. For a sendable email, call `draft_email`. Do not send until they ask and `send_email` is approved. If they asked to email themselves, omit `to`.
5. Offer one rewrite pass (tighter, warmer, or more direct) instead of a menu of tones.

## Styles

**Email** — Subject, greeting, 2–4 short paragraphs, one CTA, sign-off. Works for work, personal, thank-yous, and follow-ups. Keep outreach short and specific; do not sound like a blast.

```markdown
Subject: [specific, not "Following up"]

Hi [Name],

[Why you're writing in one sentence.]
[The useful detail or next fact.]

[One clear ask or date.]

[Sender name]
```

**Blog / article** — Title, one-sentence hook, 3–6 short sections, close with a takeaway or a single CTA. Use only facts they gave. Do not invent stats, quotes, or sources.

```markdown
# [Title that names the point]

[Hook in one or two sentences.]

## [Section]
[Short paragraphs. One idea each.]

## Takeaway
[What to remember or do next.]
```

**Plan cover** — Story (3–5 sentences), who it is for, three highlights, inclusions vs. open items. For a full plan body, load `plan` after the cover is set.

**Text / SMS** — 1–3 sentences, one question or CTA, no email sign-off or "hope this finds you well." Skip links unless they asked.

```markdown
[Name] — [one useful update]. [One question or next step]?
```

**Note** — Facts, decision, next step. No fluff. Fine for a journal, a shared checklist, or a meeting dump.

**Social / caption** — One hook + setting. No unpublished prices or private details.

**Ask / request** — Specific ask, dates, one constraint. Skip a life story unless they asked for context.

## Gotchas

- A text is not a shortened email. Drop the greeting-body-signoff shape.
- A blog post is not an email with headings. Lead with the point, then support it.
- If they asked to rewrite, keep their facts and CTA. Change voice and structure, not the deal.
- Outbound emails are drafts until approved. Notes and blog drafts can stay in chat.

## Quick start

If the user invoked this skill with `/write` and no extra brief, ask the format (email, blog, text, note, or other), audience, and goal. Then draft in that style.
