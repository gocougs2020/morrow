---
name: consultation-prep
description: >
  Use when preparing for a meeting, appointment, or call, building a
  pre-meeting brief, or writing the follow-up. Use even if they say
  "get me ready for this" or "send a recap" without saying consult.
  Load immediately when the user writes /consultation-prep.
---

# Meeting and appointment prep

Works for a client call, a vendor meeting, a doctor or school appointment, or a personal conversation they want to walk into prepared.

1. In one step, call `list_documents` (and any other independent lookups such as `list_emails`). Search for the person, meeting, or topic. Then read only the matching files, also in parallel when you have several ids.
2. Build a pre-meeting brief: goals, open questions, anything to review, and a short agenda. Show it in chat first; offer to save a file if they want one.
3. After the meeting (or when asked), draft a follow-up with decisions, remaining questions, and next dates. Use email shape only if they will send it; otherwise a short note is fine.
4. Use `draft_email` when the follow-up is an email. Do not send until the user asks and `send_email` is approved.
5. Offer to create a follow-up job with `create_schedule` if they want a reminder. Pass `skill` `consultation-prep` and a brief with who, when, and the outcome — not this procedure.

## Quick start

If the user invoked this skill with `/consultation-prep` and no extra brief, ask who the meeting is with, when it is, and what outcome they want. Then pull matching records and files and draft the brief.
