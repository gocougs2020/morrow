import { appConfig } from "@/app.config";

const SKILL_MENTION_PATTERN = /\/([a-z0-9]+(?:-[a-z0-9]+)*)/gi;
const SLASH_QUERY_PATTERN = /(^|[\s])\/([a-z0-9-]*)$/i;
const QUICK_START_HEADING = /^##\s+Quick start\b/im;

export type SkillMentionToken =
  | { type: "text"; value: string }
  | { type: "skill"; slug: string };

export type SlashQuery = {
  start: number;
  query: string;
};

export function skillMention(slug: string): string {
  return `/${slug}`;
}

function findSlashQuery(value: string, caret: number): SlashQuery | null {
  const before = value.slice(0, caret);
  const match = before.match(SLASH_QUERY_PATTERN);
  if (!match) return null;
  const query = match[2] ?? "";
  return {
    query,
    start: caret - query.length - 1,
  };
}

export function slashQueryAt(
  value: string,
  caret: number,
  slugs?: ReadonlySet<string>,
): SlashQuery | null {
  const query = findSlashQuery(value, caret);
  if (!query) return null;
  if (query.query && slugs?.has(canonicalSkillSlug(query.query.toLowerCase()))) {
    const next = value[caret];
    if (next === undefined || /\s/.test(next)) return null;
  }
  return query;
}

export function insertSkillMention(
  value: string,
  slug: string,
  caret = value.length,
): { caret: number; value: string } {
  const mention = skillMention(slug);
  const query = findSlashQuery(value, caret);
  const typed = query?.query.toLowerCase() ?? "";
  const replaceQuery = Boolean(
    query && typed !== slug && (typed.length === 0 || slug.startsWith(typed)),
  );
  const start = replaceQuery && query ? query.start : caret;
  const before = value.slice(0, start).replace(/\s+$/, "");
  const after = value.slice(caret).replace(/^\s+/, "");
  const prefix = before.length > 0 ? `${before} ` : "";
  const next = after.length > 0 ? `${prefix}${mention} ${after}` : `${prefix}${mention} `;
  return {
    caret: prefix.length + mention.length + 1,
    value: next,
  };
}

export function tokenizeSkillMentions(
  value: string,
  slugs: ReadonlySet<string>,
): SkillMentionToken[] {
  const tokens: SkillMentionToken[] = [];
  let last = 0;

  for (const match of value.matchAll(SKILL_MENTION_PATTERN)) {
    const slug = match[1]?.toLowerCase();
    const index = match.index;
    if (slug === undefined || index === undefined) continue;
    const resolved = canonicalSkillSlug(slug);
    if (!slugs.has(resolved) && !slugs.has(slug)) continue;

    const end = index + match[0].length;
    const next = value[end];
    if (next && /[a-z0-9-]/i.test(next)) continue;

    if (index > last) {
      tokens.push({ type: "text", value: value.slice(last, index) });
    }
    tokens.push({ type: "skill", slug: resolved });
    last = end;
  }

  if (last < value.length) {
    tokens.push({ type: "text", value: value.slice(last) });
  }

  return tokens;
}

const SKILL_SLUG_ALIASES: Readonly<Record<string, string>> = {
  documents: "files",
  "write-rewrite": "write",
  "text-to-image": "image",
  "lead-intake": "intake",
  "consultation-prep": "meeting-prep",
  proposal: "plan",
  "quote-management": "decide",
  "cold-email": "write",
  copywriting: "write",
  reminder: "remind",
  reminders: "remind",
};

export function canonicalSkillSlug(slug: string): string {
  return SKILL_SLUG_ALIASES[slug] ?? slug;
}

export function titleForSkillSlug(slug: string): string | undefined {
  const resolved = canonicalSkillSlug(slug);
  const skill = appConfig.skills[resolved as keyof typeof appConfig.skills];
  return skill?.title;
}

export function humanizeSkillSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function skillOnlySlug(prompt: string): string | undefined {
  const match = prompt.trim().match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/i);
  const slug = match?.[1]?.toLowerCase();
  return slug ? canonicalSkillSlug(slug) : undefined;
}

export function titleForSkillOnlyPrompt(prompt: string): string | undefined {
  const slug = skillOnlySlug(prompt);
  if (!slug) return undefined;
  return titleForSkillSlug(slug) ?? humanizeSkillSlug(slug);
}

export function ensureSkillQuickStart(body: string, slug: string): string {
  if (QUICK_START_HEADING.test(body)) return body;
  const trimmed = body.trim();
  const section = [
    "## Quick start",
    "",
    `If the user invoked this skill with \`/${slug}\` and no extra context, do not invent a brief. Ask 2–4 focused questions about what they want to accomplish, then follow the steps above and guide them through this session.`,
  ].join("\n");
  return trimmed ? `${trimmed}\n\n${section}\n` : `${section}\n`;
}

export function descriptionWithSlashHint(description: string, slug: string): string {
  const mention = skillMention(slug);
  if (description.includes(mention)) return description;
  const trimmed = description.replace(/\s+/g, " ").trim();
  return `${trimmed} Load immediately when the user writes ${mention}.`;
}
