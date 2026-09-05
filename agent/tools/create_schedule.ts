import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireEnabledSkillSlug } from "../../lib/available-skills";
import { jobCadenceSchema, scheduleFieldsFromCadence } from "../../lib/job-cadence";
import { composeSchedulePrompt, parseSchedulePrompt, SCHEDULE_BRIEF_MAX } from "../../lib/schedule-prompt";
import { SKILL_NAME_MAX, SKILL_NAME_PATTERN } from "../../lib/skill-document";
import { canonicalSkillSlug } from "../../lib/skill-mention";
import { createJob, listUserSkills } from "../../lib/store";
import { requireUser } from "../lib/identity";

const skillSlugSchema = z
  .string()
  .min(1)
  .max(SKILL_NAME_MAX)
  .transform((value) => canonicalSkillSlug(value.replace(/^\//, "").toLowerCase()))
  .refine((value) => SKILL_NAME_PATTERN.test(value), "Use a skill slug like weekly-review.");

export default defineTool({
  description:
    "Create a one-time or repeating scheduled job. Pass a configured skill plus a short this-run brief — never the skill procedure, and never a bare /slug. Omit skill only for a one-off reminder with no reusable procedure.",
  inputSchema: z.object({
    skill: skillSlugSchema
      .optional()
      .describe(
        "Enabled skill to invoke each fire (weekly-review, meeting-prep, or a custom slug). Omit only for a one-off reminder.",
      ),
    brief: z
      .string()
      .min(1)
      .max(SCHEDULE_BRIEF_MAX)
      .describe(
        "This-run facts only: who, what, which file, deadline, who to email. Do not paste skill steps or SKILL.md.",
      ),
    firstRunAt: z.string().describe("ISO 8601 datetime with offset"),
    everyMinutes: z.number().int().min(1).max(525600).nullable().default(null),
    cadence: jobCadenceSchema
      .optional()
      .describe(
        "Clock-aligned repeat: once, hourly, daily, weekly, monthly, weekdayOfMonth (first Tuesday, every other month, …), or interval. Prefer this over everyMinutes for weekdays or monthly days.",
      ),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    const parsed = parseSchedulePrompt(input.brief);
    const skillSlug = input.skill ?? parsed.skill;
    const skill = skillSlug
      ? requireEnabledSkillSlug(
          skillSlug,
          await listUserSkills(user.userId),
          "Enable or create it first, or omit skill for a one-off reminder.",
        )
      : undefined;
    const prompt = composeSchedulePrompt({
      skill,
      brief: parsed.brief || input.brief,
    });
    const fields = input.cadence ? scheduleFieldsFromCadence(input.cadence) : null;
    return await createJob(user.userId, {
      prompt,
      firstRunAt: input.firstRunAt,
      everyMinutes: fields?.everyMinutes ?? input.everyMinutes,
      cadence: fields?.cadence ?? null,
      authenticator: user.authenticator ?? "better-auth",
      issuer: user.issuer,
      visibility: "private",
    });
  },
});
