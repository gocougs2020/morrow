import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireEnabledSkillSlug } from "../../lib/available-skills";
import { jobCadenceSchema, scheduleFieldsFromCadence } from "../../lib/job-cadence";
import { composeSchedulePrompt, parseSchedulePrompt, SCHEDULE_BRIEF_MAX } from "../../lib/schedule-prompt";
import { SKILL_NAME_MAX, SKILL_NAME_PATTERN } from "../../lib/skill-document";
import { canonicalSkillSlug } from "../../lib/skill-mention";
import { listJobs, listUserSkills, updateJob } from "../../lib/store";
import { requireUser } from "../lib/identity";

const skillSlugSchema = z
  .string()
  .min(1)
  .max(SKILL_NAME_MAX)
  .transform((value) => canonicalSkillSlug(value.replace(/^\//, "").toLowerCase()))
  .refine((value) => SKILL_NAME_PATTERN.test(value), "Use a skill slug like weekly-review.");

export default defineTool({
  description:
    "Update, pause, or resume one of this user's scheduled jobs. When changing the task, pass a skill plus a short this-run brief — never the skill procedure, and never a bare /slug.",
  inputSchema: z.object({
    id: z.string(),
    skill: z
      .union([skillSlugSchema, z.null()])
      .optional()
      .describe("Enabled skill to invoke each fire. Null clears the skill (one-off reminder)."),
    brief: z
      .string()
      .min(1)
      .max(SCHEDULE_BRIEF_MAX)
      .optional()
      .describe("This-run facts only. Do not paste skill steps or SKILL.md."),
    nextRunAt: z.string().optional(),
    everyMinutes: z.number().int().min(1).max(525600).nullable().optional(),
    cadence: jobCadenceSchema
      .optional()
      .describe(
        "Clock-aligned repeat, including weekdayOfMonth for the first/last weekday of a month or every other month. Prefer this when changing weekdays, monthly days, or time of day.",
      ),
    enabled: z.boolean().optional(),
  }),
  async execute({ id, skill, brief, cadence, ...patch }, ctx) {
    const user = requireUser(ctx);
    let prompt: string | undefined;
    if (skill !== undefined || brief !== undefined) {
      const current = (await listJobs(user.userId)).find((job) => job.id === id);
      if (!current) throw new Error("Schedule not found.");
      const parsed = parseSchedulePrompt(brief ?? current.prompt);
      const currentParts = parseSchedulePrompt(current.prompt);
      const nextSlug = skill === null ? undefined : (skill ?? parsed.skill ?? currentParts.skill);
      const nextSkill = nextSlug
        ? requireEnabledSkillSlug(
            nextSlug,
            await listUserSkills(user.userId),
            "Enable or create it first, or pass skill: null for a one-off reminder.",
          )
        : undefined;
      prompt = composeSchedulePrompt({
        skill: nextSkill,
        brief: brief ? parsed.brief : currentParts.brief,
      });
    }
    const fields = cadence ? scheduleFieldsFromCadence(cadence) : null;
    const job = await updateJob(user.userId, id, {
      ...patch,
      ...(prompt !== undefined ? { prompt } : {}),
      ...(fields ?? {}),
    });
    if (!job) throw new Error("Schedule not found.");
    return job;
  },
});
