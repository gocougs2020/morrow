import type { UserSkill } from "@/lib/types";
import { normalizeSkillDisplayName } from "@/lib/skill-display-name";
import { toSkillDocument, wrapSkillDocument } from "@/lib/skill-document";

export function wrapUserSkillFields(input: {
  name?: string;
  slug: string;
  description: string;
  markdown: string;
}): Pick<UserSkill, "name" | "slug" | "description" | "markdown"> {
  const document = toSkillDocument(input);
  return {
    name: normalizeSkillDisplayName(input.name ?? "", document.name),
    slug: document.name,
    description: document.description,
    markdown: wrapSkillDocument(document),
  };
}

export function wrapUserSkillPatch(
  current: Pick<UserSkill, "name" | "slug" | "description" | "markdown">,
  patch: Partial<Pick<UserSkill, "name" | "slug" | "description" | "markdown" | "enabled">>,
): Partial<Pick<UserSkill, "name" | "slug" | "description" | "markdown" | "enabled">> {
  const contentChanged =
    patch.name !== undefined ||
    patch.slug !== undefined ||
    patch.description !== undefined ||
    patch.markdown !== undefined;
  if (!contentChanged) {
    return { enabled: patch.enabled };
  }

  return {
    ...wrapUserSkillFields({
      name: patch.name ?? current.name,
      slug: patch.slug ?? current.slug,
      description: patch.description ?? current.description,
      markdown: patch.markdown ?? current.markdown,
    }),
    enabled: patch.enabled,
  };
}
