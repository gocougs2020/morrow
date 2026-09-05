import { appConfig } from "@/app.config";
import { parseSkillChipLabel, skillDisplayName } from "@/lib/skill-display-name";
import { canonicalSkillSlug } from "@/lib/skill-mention";

export type AvailableSkill = {
  description?: string;
  emoji?: string;
  slug: string;
  source: "builtin" | "user";
  title: string;
};

export function availableSkillFromUser(skill: {
  description?: string;
  name?: string;
  slug: string;
}): AvailableSkill {
  const label = parseSkillChipLabel(skillDisplayName(skill));
  return {
    description: skill.description,
    emoji: label.emoji || undefined,
    slug: skill.slug,
    source: "user",
    title: label.title,
  };
}

export function filterHomeSuggestedSkills(skills: readonly AvailableSkill[]): AvailableSkill[] {
  return skills.filter((skill) => {
    if (skill.source === "user") return true;
    const config = appConfig.skills[skill.slug as keyof typeof appConfig.skills];
    return Boolean(config?.enabled && config.suggest);
  });
}

export function getBuiltinAvailableSkills(): AvailableSkill[] {
  return Object.entries(appConfig.skills)
    .filter(([, skill]) => skill.enabled)
    .map(([slug, skill]) => ({
      emoji: skill.emoji,
      slug,
      source: "builtin",
      title: skill.title,
    }));
}

export function filterAvailableSkills(
  skills: readonly AvailableSkill[],
  query: string,
): AvailableSkill[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...skills];
  return skills.filter(
    (skill) =>
      skill.slug.includes(needle) ||
      canonicalSkillSlug(needle) === skill.slug ||
      skill.title.toLowerCase().includes(needle) ||
      skill.description?.toLowerCase().includes(needle),
  );
}

export function mergeAvailableSkills(
  builtin: readonly AvailableSkill[],
  user: readonly AvailableSkill[],
): AvailableSkill[] {
  const seen = new Set(builtin.map((skill) => skill.slug));
  return [...builtin, ...user.filter((skill) => !seen.has(skill.slug))];
}

export function resolveEnabledSkillSlug(
  slug: string,
  userSkills: readonly { enabled: boolean; slug: string }[],
): string | undefined {
  const resolved = canonicalSkillSlug(slug.replace(/^\//, "").toLowerCase());
  if (getBuiltinAvailableSkills().some((skill) => skill.slug === resolved)) {
    return resolved;
  }
  if (userSkills.some((skill) => skill.slug === resolved && skill.enabled)) {
    return resolved;
  }
  return undefined;
}

export function requireEnabledSkillSlug(
  slug: string,
  userSkills: readonly { enabled: boolean; slug: string }[],
  fallbackHint: string,
): string {
  const resolved = resolveEnabledSkillSlug(slug, userSkills);
  if (!resolved) {
    throw new Error(`Skill "${slug}" is not enabled. ${fallbackHint}`);
  }
  return resolved;
}
