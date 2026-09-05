import { defineSchedule } from "eve/schedules";
import { scheduleDispatchMessage } from "../../lib/schedule-prompt";
import { claimDueJobs, completeJob, releaseJob } from "../../lib/store";
import eve from "../channels/eve";

export default defineSchedule({
  cron: "* * * * *",
  run({ to, waitUntil }) {
    waitUntil(
      (async () => {
        const jobs = await claimDueJobs({
          now: new Date(),
          limit: 25,
          leaseForMs: 5 * 60_000,
        });

        await Promise.all(
          jobs.map(async (job) => {
            try {
              await to(eve, {}).send(
                scheduleDispatchMessage(job),
                {
                  auth: {
                    authenticator: job.authenticator,
                    principalId: job.userId,
                    principalType: "user",
                    ...(job.issuer ? { issuer: job.issuer } : {}),
                    attributes: { scheduleId: job.id },
                  },
                },
              );
              await completeJob(job);
            } catch (error) {
              await releaseJob(
                job,
                error instanceof Error ? error.message : "Schedule dispatch failed",
                new Date(Date.now() + 300_000),
              );
            }
          }),
        );
      })(),
    );
  },
});
