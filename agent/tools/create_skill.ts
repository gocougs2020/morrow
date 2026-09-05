import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { SKILL_DISPLAY_NAME_MAX } from "../../lib/skill-display-name";
import { SKILL_DESCRIPTION_MAX, SKILL_NAME_MAX, SKILL_NAME_PATTERN } from "../../lib/skill-document";
import { wrapUserSkillFields } from "../../lib/skill-record";
import { createUserSkill } from "../../lib/store";

export default defineTool({
  description:
    "Create a custom skill the user can reuse in later sessions. Include a Quick start section so the agent can guide the user when they invoke the skill with /slug and no extra context.",
  inputSchema: z.object({
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
      .regex(SKILL_NAME_PATTERN, "Use lowercase letters, numbers, and single hyphens."),
    description: z
      .string()
      .min(1)
      .max(SKILL_DESCRIPTION_MAX)
      .describe("When this skill applies, including when the user writes /slug."),
    markdown: z
      .string()
      .min(20)
      .max(20_000)
      .describe("Skill body with steps and a ## Quick start section for bare /slug invokes."),
  }),
  async execute(input, ctx) {
    return await createUserSkill(requireUser(ctx).userId, {
      ...wrapUserSkillFields(input),
      visibility: "private",
    });
  },
});
