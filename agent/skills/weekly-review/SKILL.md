---
name: weekly-review
description: >
  Use when the user wants a weekly review, a look-back plus next-week
  priorities, or a repeating Friday or Sunday recap. Works for work,
  personal life, or both. Load immediately when the user writes
  /weekly-review.
---

# Weekly review

A short look-back and a short look-ahead. Mix work and personal only if both showed up in their files or they asked for both.

1. In one step, call `list_documents` (and `list_emails` if mail is likely relevant). Search for this week's files, notes, and plans. Then read only the matching files, in parallel when you have several ids.
2. Draft a one-screen review: done, still open, waiting on someone else, and 3–5 priorities for next week.
3. Flag anything that needs a decision, a meeting, or a reminder. Do not invent status they did not give you.
4. Show the review in chat first. Then offer to `create_document` if they want a file.
5. Offer a repeating job with `create_schedule` if they want this every week. Pass `skill` `weekly-review` and a brief with the weekday and what to include — not this procedure.

## Quick start

If the user invoked this skill with `/weekly-review` and no extra brief, ask whether this is work, personal, or both, and which weekday they want it for. Then pull recent files and draft the review.
