---
name: household
description: >
  Use when planning meals, weekends, errands, packing, chores, or
  family logistics. Use even if they say "what's for dinner," "plan
  Saturday," or "packing list" without saying household. Load
  immediately when the user writes /household.
---

# Household

Practical plans for home life. Keep it doable for the people and time they actually have.

1. Confirm who it is for (just them, a household, roommates, kids), the window (tonight, this weekend, this week), and the job (meals, errands, packing, chores, or a mix).
2. Ask only missing constraints: diet or allergies, budget band, time, who can help, and must-dos. Do not invent store prices or store hours.
3. Return a short plan: meals or lists, who does what if it is shared, a shopping or packing list, and open items.
4. Show it in chat first. Then offer to `create_document` if they want a file they can reuse.
5. Offer a reminder if something is time-sensitive (pack Friday, shop Sunday). Load `remind` for a personal ping or agent follow-through. Pass `skill` `household` only when this procedure should run again at that time.

## Quick start

If the user invoked this skill with `/household` and no extra brief, ask who it is for, the window, and whether they need meals, errands, packing, or chores. Then draft a plan from what they give you.
