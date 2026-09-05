---
name: image
description: >
  Use when the user wants to generate, create, draw, illustrate, or
  visualize an image from a text description — mood boards, scenes,
  gifts, social, decks, or any text-to-image request. Load immediately
  when the user writes /image or /text-to-image.
---

# Text to image

1. Confirm the visual: subject, setting, mood, style, and how the user will use it (personal mood board, gift, social, deck, or plan).
2. Write a concrete generation prompt. Include composition, lighting, palette, and what to avoid. Do not invent identifying details about real people.
3. Call `generate_image` with that prompt. Prefer `1024x1024` and `medium` unless they ask for landscape, portrait, or higher quality.
4. Show the generated image and a short caption they can paste or reuse. The image is also saved as a file they can reopen or share. Offer one revision path if they want a different vibe.
5. For follow-up edits, call `generate_image` again with an updated prompt rather than describing pixels they cannot see.

## Quick start

If the user invoked this skill with `/image` and no extra brief, ask subject, setting, mood or style, and where they will use the image. Then write a generation prompt and call `generate_image`.
