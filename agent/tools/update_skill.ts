import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { SKILL_DISPLAY_NAME_MAX } from "../../lib/skill-display-name";
import { SKILL_DESCRIPTION_MAX, SKILL_NAME_MAX, SKILL_NAME_PATTERN } from "../../lib/skill-document";
import { wrapUserSkillPatch } from "../../lib/skill-record";
import { listUserSkills, updateUserSkill } from "../../lib/store";

export default defineTool({
  description: "Update or disable one of this user's custom skills.",
  inputSchema: z.object({
    id: z.string(),
    name: z
      .string()
      .min(1)
      .max(SKILL_DISPLAY_NAME_MAX)
      .describe("Chip label: one emoji plus at most three words. Example: 👋 Client intake.")
      .optional(),
    slug: z
      .string()
      .min(1)
      .max(SKILL_NAME_MAX)
      .regex(SKILL_NAME_PATTERN, "Use lowercase letters, numbers, and single hyphens.")
      .optional(),
    description: z.string().min(1).max(SKILL_DESCRIPTION_MAX).optional(),
    markdown: z.string().min(20).max(20_000).optional(),
    enabled: z.boolean().optional(),
  }),
  async execute({ id, ...patch }, ctx) {
    const userId = requireUser(ctx).userId;
    const current = (await listUserSkills(userId)).find((skill) => skill.id === id);
    if (!current) {
      const known = (await listUserSkills(userId)).map((row) => row.id);
      throw new Error(`Skill not found. Known ids: ${known.join(", ") || "none"}`);
    }
    const skill = await updateUserSkill(userId, id, wrapUserSkillPatch(current, patch));
    if (!skill) {
      throw new Error(`Skill not found. Known ids: ${current.id}`);
    }
    return skill;
  },
});
