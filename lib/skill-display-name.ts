import { SkillDocumentError } from "@/lib/skill-document";
import { humanizeSkillSlug } from "@/lib/skill-mention";

export const SKILL_DISPLAY_NAME_MAX_WORDS = 3;
export const SKILL_DISPLAY_NAME_MAX = 64;

/** Leading emoji sequence: pictographs, ZWJ, variation selectors, and flags. */
const LEADING_EMOJI_PATTERN =
  /^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\p{Emoji_Modifier})*(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\p{Emoji_Modifier})*)*|\p{Regional_Indicator}{2})+/u;

export type SkillChipLabel = {
  emoji: string;
  title: string;
};

export function parseSkillChipLabel(value: string): SkillChipLabel {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const match = trimmed.match(LEADING_EMOJI_PATTERN);
  if (!match) {
    return { emoji: "", title: trimmed };
  }
  const emoji = match[0];
  const title = trimmed.slice(emoji.length).trim();
  return title ? { emoji, title } : { emoji: "", title: trimmed };
}

export function displayNameWords(value: string): string[] {
  return parseSkillChipLabel(value).title.split(/\s+/).filter(Boolean);
}

export function skillDisplayName(skill: { name?: string; slug: string }): string {
  const name = skill.name?.replace(/\s+/g, " ").trim();
  return name || humanizeSkillSlug(skill.slug);
}

export function ensureSkillDisplayNameEmoji(value: string, fallbackEmoji = "✨"): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  const { emoji, title } = parseSkillChipLabel(trimmed);
  return emoji ? trimmed : `${fallbackEmoji} ${title}`.trim();
}

export function normalizeSkillDisplayName(value: string, fallbackSlug?: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const resolved = trimmed || (fallbackSlug ? humanizeSkillSlug(fallbackSlug) : "");
  if (!resolved) {
    throw new SkillDocumentError("Skill name is required.");
  }
  if (resolved.length > SKILL_DISPLAY_NAME_MAX) {
    throw new SkillDocumentError(`Skill name must be ${SKILL_DISPLAY_NAME_MAX} characters or fewer.`);
  }
  const words = displayNameWords(resolved);
  if (words.length === 0) {
    throw new SkillDocumentError("Skill name must include a short label after the emoji.");
  }
  if (words.length > SKILL_DISPLAY_NAME_MAX_WORDS) {
    throw new SkillDocumentError(
      `Skill name must be ${SKILL_DISPLAY_NAME_MAX_WORDS} words or fewer.`,
    );
  }
  return resolved;
}

export function sanitizeSkillDisplayName(value: string, fallbackSlug: string): string {
  try {
    return normalizeSkillDisplayName(value, fallbackSlug);
  } catch {
    const trimmed = value.replace(/\s+/g, " ").trim() || humanizeSkillSlug(fallbackSlug);
    const { emoji, title } = parseSkillChipLabel(trimmed);
    const words = title.split(/\s+/).filter(Boolean).slice(0, SKILL_DISPLAY_NAME_MAX_WORDS);
    const next = [emoji, ...words].filter(Boolean).join(" ").trim();
    return next.slice(0, SKILL_DISPLAY_NAME_MAX) || humanizeSkillSlug(fallbackSlug);
  }
}
