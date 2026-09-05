---
name: quote-management
description: >
  Use when comparing options or quotes, presenting choices, or
  recording a decision — a vendor bid, a purchase, or a client
  package. Use even if they say "which option" or "I picked B"
  without saying quote. Do not invent prices. Load immediately when
  the user writes /quote-management.
---

# Options, quotes, and decisions

1. List distinct options in chat with price band, what is included, tradeoffs, and fit to the brief. Do not invent guaranteed prices.
2. Then offer to `create_document` with those structured options as a markdown file. Do not save before they have seen the comparison unless they already asked to file it.
3. When a decision is made — by the user, a client, or a household — update that file with `read_document` and `update_document` (chosen option and rationale). Create a new file only if they asked for a separate decision note.
4. Outline next steps: payment or approval, names, required files, and any holds or deadlines.
5. Offer an expiry reminder via `create_schedule` if a hold, quote, or sale is time-sensitive. Pass `skill` `quote-management` and a brief with the option, file, and deadline — not this procedure.

## Quick start

If the user invoked this skill with `/quote-management` and no extra brief, ask which options or quotes to compare and whether a decision was already made. Do not invent prices.
