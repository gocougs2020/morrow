import { defineSchedule } from "eve/schedules";
import { dispatchDueJobs, startScheduleSession } from "../../lib/dispatch-jobs";
import { scheduleDispatcherCron } from "../../lib/vercel-plan";

export default defineSchedule({
  cron: scheduleDispatcherCron(),
  async run({ waitUntil }) {
    // withEve compiles this into a Vercel Cron Job. Await the sweep so the
    // invocation does not freeze before sessions start; waitUntil is the
    // eve-documented keep-alive if the runtime parks the handler.
    // Handoff is POST /eve/v1/session — the eve HTTP channel has no
    // cross-channel receive() hook.
    const work = dispatchDueJobs((job, chat) => startScheduleSession(job, chat));
    waitUntil(work);
    await work;
  },
});
