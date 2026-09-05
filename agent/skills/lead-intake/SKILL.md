---
name: lead-intake
description: >
  Optional deeper checklist for a new person, request, or project —
  a client, a household, a contractor, or a personal plan. Standing
  instructions already cover a first pass — do not load this before a
  first-pass reply unless the user invoked it with /lead-intake. Load
  immediately when they write /lead-intake, including when that is the
  entire message.
---

# Intake

A short intake procedure is already in standing instructions. Use this only for the full checklist.

This is for capturing a person, request, or project — work or personal. Do not assume it is a sales lead.

1. Collect who it is for (themselves, a household, a team, a client, or someone else), names and roles if useful, contact info if it matters, dates or flexibility, budget band if money is involved, desired outcome, and hard constraints.
2. Ask only for missing facts. Do not invent a profile.
3. Qualify only when they are deciding whether to take work, hire someone, or commit money: budget vs. scope, timing, who decides, and whether they should proceed. For a personal plan, skip sales qualification and just lock the brief.
4. Return a one-screen brief: snapshot, any qualification, missing facts, recommended next step.
5. Then offer to `create_document` with the brief as a markdown file. Include qualification (`new` / `qualified` / `unqualified` / `nurture` when that applies) and focus, location, topic, or other notes in the file body. Do not save before they have seen the brief unless they already asked to file it. Do not put this in sticky-note memory.

## Quick start

If the user invoked this skill with `/lead-intake` and no extra brief, say you will run intake, then ask who it is for, dates or flexibility, budget if relevant, desired outcome, and hard constraints. Do not invent a profile. Once they answer, follow the checklist above.
