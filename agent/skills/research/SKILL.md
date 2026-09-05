---
name: research
description: >
  Use when researching options, products, places, people, vendors,
  events, or conditions — for themselves or someone else. Use even if
  they ask "what's good in…" or "who should I use" without saying
  research. Load immediately when the user writes /research.
---

# Research

1. Confirm who it is for, the topic, dates or window, and constraints first. If you can give a useful first-pass from what you already know, do that, then offer to search.
2. When you need live sources, run independent `web_search` queries in the same step.
3. Separate confirmed facts from items that still need a person, vendor, or source to confirm.
4. Return in chat: recommended options, why they fit, risks, and sources.
5. Then offer to save a durable brief with `create_document` if they want a file. Do not save before they have seen the findings unless they already asked for a file.

## Quick start

If the user invoked this skill with `/research` and no extra brief, ask who it is for, the topic, dates or window, and constraints. Then give a first-pass from what you already know and offer live search.
