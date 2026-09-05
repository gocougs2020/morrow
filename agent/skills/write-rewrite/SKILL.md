---
name: write-rewrite
description: >
  Optional full style templates. Standing instructions already cover a
  first-pass draft — do not load this before writing unless the user
  invoked it with /write-rewrite. Load immediately when they write
  /write-rewrite, including when that is the entire message.
---

# Write and rewrite

A short write/rewrite procedure is already in standing instructions. Load this only for the full style templates.

Write in the user's voice, ready to paste. Do not invent prices, inventory, legal terms, or inclusions they did not confirm. Match formality to the audience — work, personal, or mixed.

1. Pick the format. If they named one, use it. If they pasted copy, infer from length and greeting. If still unclear, ask once: email, plan, text, quote, note, or other.
2. Confirm only missing facts that change the draft: audience, goal, CTA, names, dates, and any numbers they already have. Do not reopen a locked brief.
3. Draft in the matching style below. Default to the user's existing voice if one is in memory or the paste; otherwise clear, warm, and useful.
4. For a sendable email, call `draft_email`. Do not send until they ask and `send_email` is approved. If they asked to email themselves, omit `to`. Resend delivers it and stores a copy on Inbox.
5. Offer one rewrite pass (tighter, warmer, or more direct) instead of a menu of tones.

## Styles

**Email** — Subject, greeting, 2–4 short paragraphs, one CTA, sign-off. For cold outreach, load `cold-email`. For landing pages or conversion copy, load `copywriting`.

```markdown
Subject: [specific, not "Following up"]

Hi [Name],

[Why you're writing in one sentence.]
[The useful detail or next fact.]

[One clear ask or date.]

[Sender name]
```

**Plan cover** — Story (3–5 sentences), who it is for, three highlights, inclusions vs. open items. For a full plan body, load `proposal` after the cover is set.

```markdown
# [Name]

[Story: who, when, what this should feel like.]

**For** [audience] · **When** [dates or window] · **Pace** [relaxed / mixed / full]

## Why this works
- [Highlight tied to their brief]
- [Highlight]
- [Highlight]

**Included** [only confirmed items]
**Still open** [holds, approvals, or questions]
```

**Text / SMS** — 1–3 sentences, one question or CTA, no email sign-off or "hope this finds you well." Skip links unless they asked.

```markdown
[Name] — [one useful update]. [One question or next step]?
```

**Quote comparison** — Option name, price band only if they gave one, inclusions, tradeoff, fit. Never invent a price. To save options or log a decision, load `quote-management`.

```markdown
**[Option A]** — [price band or "price TBD"]
Inclusions: …
Tradeoff: …
Fit: [why this matches the brief]
```

**Other common styles**

- **Note** — Facts, decision, next step. No fluff. Fine for a CRM, a journal, or a shared checklist.
- **Ask / request** — Specific ask, dates, one constraint. Skip a life story unless they asked for context.
- **Social / caption** — One hook + setting. No prices or unpublished details.
- **Voicemail** — ~15 seconds: name, why, one callback ask.

## Gotchas

- A text is not a shortened email. Drop the greeting-body-signoff shape.
- Quotes stay factual. Plans can have more color; the price line cannot be made up.
- If they asked to rewrite, keep their facts and CTA. Change voice and structure, not the deal.
- Outbound emails are drafts until approved. Internal and personal notes can stay in chat.

## Quick start

If the user invoked this skill with `/write-rewrite` and no extra brief, ask the format (email, plan, text, quote, note, or other), audience, and goal. Then draft in that style.
