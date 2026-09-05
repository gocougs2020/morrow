---
name: decide
description: >
  Use when comparing options or recording a decision — vendors,
  purchases, schools, trips, tools, or household choices. Use even if
  they say "which option" or "I picked B" without saying decide. Do
  not invent prices. Load immediately when the user writes /decide or
  /quote-management.
---

# Compare and decide

1. List distinct options in chat with price band only if they gave one, what is included, tradeoffs, and fit to the brief. Do not invent guaranteed prices.
2. Then offer to `create_document` with those structured options as a markdown file. Do not save before they have seen the comparison unless they already asked to file it.
3. When a decision is made — by the user, a team, or a household — update that file with `read_document` and `update_document` (chosen option and rationale). Create a new file only if they asked for a separate decision note.
4. Outline next steps: payment or approval, names, required files, and any holds or deadlines.
5. Offer a reminder via `create_schedule` if a hold, sale, or RSVP is time-sensitive. Pass `skill` `decide` and a brief with the option, file, and deadline — not this procedure.

## Quick start

If the user invoked this skill with `/decide` and no extra brief, ask which options to compare and whether a decision was already made. Do not invent prices.
