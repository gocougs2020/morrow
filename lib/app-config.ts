import { appConfig } from "../app.config";

export { appConfig } from "../app.config";
export type { AppConfig, AppSkillConfig } from "../app.config";

export type SuggestedSkill = {
  slug: string;
  title: string;
  emoji: string;
};

export type BuiltinSkill = {
  slug: string;
  title: string;
};

export type BuiltinSkillDoc = BuiltinSkill & {
  markdown: string;
};

export function getSuggestedSkills(): SuggestedSkill[] {
  return Object.entries(appConfig.skills)
    .filter(([, skill]) => skill.enabled && skill.suggest)
    .map(([slug, skill]) => ({
      slug,
      title: skill.title,
      emoji: skill.emoji,
    }));
}

export function getEnabledBuiltinSkills(): BuiltinSkill[] {
  return Object.entries(appConfig.skills)
    .filter(([, skill]) => skill.enabled)
    .map(([slug, skill]) => ({ slug, title: skill.title }));
}

export function disabledBuiltinSkillSlugs(): string[] {
  return Object.entries(appConfig.skills)
    .filter(([, skill]) => !skill.enabled)
    .map(([slug]) => slug);
}
