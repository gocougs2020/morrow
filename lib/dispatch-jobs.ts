import { Client } from "eve/client";
import { hasNeon } from "@/lib/db";
import { reminderContextForDispatch } from "@/lib/reminder-context";
import {
  isNudgeReminderSchedule,
  isReminderSchedule,
  parseSchedulePrompt,
  scheduleDispatchMessage,
  schedulePreviewText,
} from "@/lib/schedule-prompt";
import { isOneOffJob } from "@/lib/job-cadence";
import {
  claimDueJobs,
  claimJob,
  completeJob,
  createChat,
  deleteJob,
  releaseJob,
  titleFromPrompt,
  updateChat,
} from "@/lib/store";
import type { ChatRecord, ScheduledJob } from "@/lib/types";

export const SCHEDULE_DISPATCH_USER_HEADER = "x-schedule-user-id";
export const SCHEDULE_DISPATCH_CHAT_HEADER = "x-schedule-chat-id";
export const SCHEDULE_DISPATCH_JOB_HEADER = "x-schedule-id";
export const SCHEDULE_DISPATCH_SECRET_HEADER = "x-schedule-dispatch-secret";
export const SCHEDULE_DISPATCH_REMINDER_HEADER = "x-schedule-reminder";

const DEFAULT_LEASE_MS = 5 * 60_000;
const RETRY_MS = 300_000;

export type ScheduleStartSession = (
  job: ScheduledJob,
  chat: ChatRecord,
) => Promise<{ sessionId: string }>;

export function scheduleDispatchSecret(): string | null {
  return (
    process.env.EMAIL_SESSION_SECRET?.trim() ||
    process.env.RESEND_WEBHOOK_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    null
  );
}

function httpsOrigin(host: string | undefined): string | null {
  const trimmed = host?.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function appOrigin(request?: Request): string {
  const configured = httpsOrigin(process.env.BETTER_AUTH_URL);
  if (configured) return configured;
  const hosted =
    httpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) || httpsOrigin(process.env.VERCEL_URL);
  if (hosted) return hosted;
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

function vercelProtectionBypassHeaders(): Record<string, string> {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!bypass) return {};
  return { "x-vercel-protection-bypass": bypass };
}

export async function prepareScheduleChat(job: ScheduledJob): Promise<ChatRecord> {
  // One-off reminders email the user from this session. Later: push
  // notifications, and a dedicated reminders page separate from Schedules.
  return createChat(job.userId, titleFromPrompt(schedulePreviewText(job.prompt)), "schedule");
}

export async function dispatchClaimedJobs(
  jobs: readonly ScheduledJob[],
  startSession: ScheduleStartSession,
): Promise<{ dispatched: number; failed: number; errors: string[] }> {
  let dispatched = 0;
  let failed = 0;
  const errors: string[] = [];
  await Promise.all(
    jobs.map(async (job) => {
      try {
        const chat = await prepareScheduleChat(job);
        const started = await startSession(job, chat);
        if (started.sessionId) {
          await updateChat(job.userId, chat.id, { sessionId: started.sessionId });
        }
        const completed = await completeJob(job);
        if (!completed) {
          console.warn("[schedule] lost lease before complete", { jobId: job.id });
          if (isOneOffJob(job)) {
            const deleted = await deleteJob(job.userId, job.id);
            if (!deleted) {
              console.warn("[schedule] one-off still present after lost lease", { jobId: job.id });
            }
          }
        }
        dispatched += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Schedule dispatch failed";
        errors.push(message);
        console.error("[schedule] dispatch failed", { jobId: job.id, error: message });
        const retryAt = isOneOffJob(job) ? new Date(Date.now() + RETRY_MS) : null;
        const released = await releaseJob(job, message, retryAt);
        if (!released) {
          console.warn("[schedule] lost lease before release", { jobId: job.id });
        }
      }
    }),
  );
  return { dispatched, failed, errors };
}

export async function dispatchDueJobs(
  startSession: ScheduleStartSession,
  options?: { now?: Date; limit?: number; leaseForMs?: number },
): Promise<{
  claimed: number;
  dispatched: number;
  failed: number;
  errors: string[];
  store: "neon" | "json";
}> {
  const now = options?.now ?? new Date();
  const jobs = await claimDueJobs({
    now,
    limit: options?.limit ?? 25,
    leaseForMs: options?.leaseForMs ?? DEFAULT_LEASE_MS,
  });
  const store = hasNeon() ? "neon" : "json";
  if (jobs.length === 0) {
    console.info("[schedule] claimed 0", { store });
    return { claimed: 0, dispatched: 0, failed: 0, errors: [], store };
  }
  console.info("[schedule] claimed", { store, count: jobs.length });
  const result = await dispatchClaimedJobs(jobs, startSession);
  return { claimed: jobs.length, ...result, store };
}

export async function dispatchJobNow(
  job: ScheduledJob,
  startSession: ScheduleStartSession,
  options?: { now?: Date; leaseForMs?: number },
): Promise<ScheduledJob> {
  const claimed = await claimJob(job.id, {
    now: options?.now ?? new Date(),
    leaseForMs: options?.leaseForMs ?? DEFAULT_LEASE_MS,
  });
  if (!claimed) {
    throw new Error(job.enabled ? "This schedule is already running." : "This schedule is paused.");
  }
  const result = await dispatchClaimedJobs([claimed], startSession);
  if (result.failed > 0) {
    throw new Error(result.errors[0] || "Unable to run this schedule.");
  }
  return claimed;
}

export function eveScheduleClient(
  job: ScheduledJob,
  chat: ChatRecord,
  request?: Request,
): Client {
  const secret = scheduleDispatchSecret();
  if (!secret) {
    throw new Error("A dispatch secret is not configured.");
  }
  return new Client({
    host: appOrigin(request),
    headers: {
      [SCHEDULE_DISPATCH_SECRET_HEADER]: secret,
      [SCHEDULE_DISPATCH_USER_HEADER]: job.userId,
      [SCHEDULE_DISPATCH_CHAT_HEADER]: chat.id,
      [SCHEDULE_DISPATCH_JOB_HEADER]: job.id,
      ...(isReminderSchedule(job.prompt) ? { [SCHEDULE_DISPATCH_REMINDER_HEADER]: "1" } : {}),
      ...vercelProtectionBypassHeaders(),
    },
    redirect: "manual",
  });
}

export async function startScheduleSession(
  job: ScheduledJob,
  chat: ChatRecord,
  request?: Request,
): Promise<{ sessionId: string }> {
  const client = eveScheduleClient(job, chat, request);
  const origin = appOrigin(request);
  const context = isNudgeReminderSchedule(job.prompt)
    ? await reminderContextForDispatch({
        brief: parseSchedulePrompt(job.prompt).brief,
        excludeChatId: chat.id,
        origin,
        userId: job.userId,
      })
    : undefined;
  const { session } = await client.sessions.create({
    message: scheduleDispatchMessage(job, {
      chatId: chat.id,
      context,
      origin,
    }),
  });
  return { sessionId: session.state.sessionId };
}
