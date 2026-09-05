import { defineDynamic, defineSkill } from "eve/skills";
import { toSkillDocument } from "../../lib/skill-document";
import { descriptionWithSlashHint, ensureSkillQuickStart } from "../../lib/skill-mention";
import { listUserSkills } from "../../lib/store";

export default defineDynamic({
  events: {
    "session.started": async (_event, ctx) => {
      const userId = ctx.session.auth.current?.principalId;
      if (ctx.session.auth.current?.principalType !== "user" || !userId) {
        return null;
      }

      const skills = (await listUserSkills(userId)).filter((skill) => skill.enabled);
      if (skills.length === 0) return null;

      const bySlug = new Map<string, (typeof skills)[number]>();
      for (const skill of skills) {
        const existing = bySlug.get(skill.slug);
        if (!existing || skill.userId === userId) bySlug.set(skill.slug, skill);
      }

      return Object.fromEntries(
        [...bySlug.values()].map((skill) => {
          const document = toSkillDocument(skill, { loose: true });
          return [
            document.name,
            defineSkill({
              description: descriptionWithSlashHint(document.description, document.name),
              markdown: ensureSkillQuickStart(document.body, document.name),
            }),
          ];
        }),
      );
    },
  },
});
