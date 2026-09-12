import { defineSchedule } from "eve/schedules";
import eve from "../channels/eve";
import { buildScheduleDispatch, dispatchDueJobs } from "../../lib/dispatch-jobs";
import { scheduleDispatcherCron } from "../../lib/vercel-plan";

export default defineSchedule({
  cron: scheduleDispatcherCron(),
  async run({ to, waitUntil }) {
    const work = dispatchDueJobs(async (job, chat) => {
      const { message, auth } = await buildScheduleDispatch(job, chat);
      const session = await to(eve, { address: chat.id }).send(message, { auth });
      return { sessionId: session.id };
    });
    waitUntil(work);
    await work;
  },
});
