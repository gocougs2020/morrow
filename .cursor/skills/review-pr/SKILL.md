---
name: review-pr
description: >-
  Triage an incoming GitHub pull request for Jarvis: summarize added or
  removed functionality, list pros, list concerns (security, UI, UX, bloat,
  skill-slot), and give a merge score. Use when the user pastes a PR URL or
  number, asks to review or triage a contributor PR, or runs /review-pr.
---

# Review PR

Maintainer triage for contributor pull requests. Do not merge, close, push, or
leave a GitHub comment unless the user explicitly asks. Do not implement the
PR or "fix" it as part of this skill.

This is Cursor maintainer tooling. Never copy this skill into `agent/skills/`.

## When to run

The user names a PR (`https://github.com/.../pull/12`, `#12`, `pr 12`) or says
review / triage / score this PR. If they name no PR, use `gh pr view` for the
current branch. If that fails, ask for a URL or number.

## Workflow

1. Resolve the PR. If they named a branch or URL and it is not the current
   checkout, say so and review from `gh` output — do not stash or switch
   branches unless they ask.
2. Fetch facts with `gh` (parallel):

   ```bash
   gh pr view <n> --json number,title,body,author,additions,deletions,changedFiles,files,labels,commits,baseRefName,headRefName,url,isDraft
   gh pr diff <n>
   gh pr checks <n>
   ```

3. Read [criteria.md](criteria.md) before scoring. Skim only the files the
   diff actually touches; do not explore the rest of the tree.
4. Write the report below. Base every claim on the diff. If something is
   unclear, say so — do not invent intent.

## Report format

Use this exact heading structure:

```markdown
# PR #<n>: <title>

**Verdict:** <Merge / Lean merge / Request changes / Close>
**Score:** <1–10>/10
**CI:** <pass / fail / pending / unknown> — one line

## Functionality
What this PR adds or removes for a person using or deploying Jarvis.
Bullets. Call out no-ops, refactors with no user-visible change, and
drive-by rewrites.

## Pros
Why bringing this into `main` could be good. Concrete, not complimentary.

## Concerns
### Security
Auth, allowlists, secrets, share links, visibility, SSRF, injection,
untrusted email, cost/abuse. Write `None material` if the diff does not
touch those surfaces.

### UI / UX
Layout, copy, empty/error states, mobile, settings/home chips, whether a
browser pass is still needed.

### Bloat
New deps, new tables, new tools, new skills, copy-pasted framework skills,
unrelated reformats, second identity.

### Slot
Agent skill-slot cost (eve advertises every `agent/skills/` folder every
turn), home-page suggestion chips, Settings surface, and whether this
belongs in the starter vs a fork.

## Score rationale
2–4 sentences: why this number, what would raise or lower it.

## Suggested reply
3–6 sentences the maintainer can paste on the PR: why it was accepted or
not, or what must change. Neutral and specific.
```

## Scoring

| Score | Verdict |
| --- | --- |
| 8–10 | Merge — small, on-mission, concerns are nits |
| 6–7 | Lean merge — good direction; name the fixes first |
| 4–5 | Request changes — useful idea, not mergeable as-is |
| 1–3 | Close — wrong layer, unsafe, or a drive-by rewrite |

A **single** material security issue caps the score at 4. Secrets in the
diff, a new coding-agent skill under `agent/skills/`, or a surprise
multi-file rewrite with no issue: Close (1–3).

Do not average vibes. Weight security first, then slot/bloat, then UX,
then polish.
