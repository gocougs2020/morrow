import { COMPILED_VERCEL_BILLING_PLAN } from "@/lib/compiled-vercel-plan";
import type { JobCadence } from "@/lib/job-cadence";

export type HostSchedulePlan = "hobby" | "pro";
export type HostSchedulePlanSource = "api" | "default";

export type HostSchedulePlanInfo = {
  plan: HostSchedulePlan;
  source: HostSchedulePlanSource;
  allowsSubDaily: boolean;
};

export const HOBBY_DISPATCHER_CRON = "0 0 * * *";
export const PRO_DISPATCHER_CRON = "* * * * *";
export const MIN_HOBBY_INTERVAL_MINUTES = 1_440;

const CACHE_MS = 5 * 60_000;

export const SUB_DAILY_SCHEDULE_MESSAGE =
  "This host only runs scheduled jobs once a day. Use once, daily, weekly, or monthly — not hourly or an interval under 24 hours. Add VERCEL_TOKEN and a Pro (or Enterprise) plan, then redeploy, for minute-level jobs.";

let cache: { at: number; info: HostSchedulePlanInfo } | null = null;

export function vercelBillingToken(): string | null {
  return process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_ACCESS_TOKEN?.trim() || null;
}

export function isPaidVercelPlan(value: string | null | undefined): boolean {
  const plan = value?.trim().toLowerCase();
  return plan === "pro" || plan === "enterprise";
}

export function parseVercelBillingPlan(value: unknown): HostSchedulePlan | null {
  if (typeof value !== "string") return null;
  const plan = value.trim().toLowerCase();
  if (plan === "hobby") return "hobby";
  if (plan === "pro" || plan === "enterprise") return "pro";
  return null;
}

export function billingPlanFromPayload(payload: unknown): HostSchedulePlan | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    billing?: { plan?: unknown };
    user?: { billing?: { plan?: unknown } };
  };
  return (
    parseVercelBillingPlan(root.billing?.plan) ?? parseVercelBillingPlan(root.user?.billing?.plan)
  );
}

export function cadenceFiresMoreThanOncePerDay(
  cadence?: JobCadence | null,
  everyMinutes?: number | null,
): boolean {
  if (cadence) {
    if (cadence.kind === "hourly") return true;
    if (cadence.kind === "interval") return cadence.everyMinutes < MIN_HOBBY_INTERVAL_MINUTES;
    return false;
  }
  return typeof everyMinutes === "number" && everyMinutes > 0 && everyMinutes < MIN_HOBBY_INTERVAL_MINUTES;
}

export function hobbyDefaultPlan(): HostSchedulePlanInfo {
  return { plan: "hobby", source: "default", allowsSubDaily: false };
}

export function planInfoFor(plan: HostSchedulePlan, source: HostSchedulePlanSource): HostSchedulePlanInfo {
  return { plan, source, allowsSubDaily: plan === "pro" };
}

export function resetHostSchedulePlanCache() {
  cache = null;
}

export function compiledSchedulePlan(): HostSchedulePlan {
  return parseVercelBillingPlan(process.env.VERCEL_BILLING_PLAN) ?? COMPILED_VERCEL_BILLING_PLAN;
}

export function scheduleDispatcherCron(): string {
  return compiledSchedulePlan() === "pro" ? PRO_DISPATCHER_CRON : HOBBY_DISPATCHER_CRON;
}

export function schedulePlanInstruction(info: HostSchedulePlanInfo): string {
  if (info.allowsSubDaily) {
    return "This host is on a Vercel Pro (or Enterprise) plan. Scheduled jobs may use once, hourly, daily, weekly, monthly, weekdayOfMonth, or interval cadences, including intervals under 24 hours.";
  }
  if (info.plan === "pro") {
    return [
      "This host's Vercel team is Pro, but this deploy still ticks once a day.",
      "Scheduled jobs may fire at most once a day until you redeploy.",
      "Use cadence once, daily, weekly, monthly, or weekdayOfMonth.",
      "Do not use hourly, and do not use interval with everyMinutes under 1440.",
    ].join(" ");
  }
  return [
    "This host is treated as a Vercel Hobby plan (no billing token, or the team is Hobby).",
    "Scheduled jobs may fire at most once a day. Use cadence once, daily, weekly, monthly, or weekdayOfMonth.",
    "Do not use hourly, and do not use interval with everyMinutes under 1440.",
    "If they want something more often than once a day, say this deploy only ticks daily until VERCEL_TOKEN is set and the Vercel team is Pro, then redeployed.",
  ].join(" ");
}

export async function resolveHostSchedulePlan(): Promise<HostSchedulePlanInfo> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.info;
  const info = await fetchHostSchedulePlan();
  cache = { at: Date.now(), info };
  return info;
}

async function fetchHostSchedulePlan(): Promise<HostSchedulePlanInfo> {
  const billed = await lookupBillingPlan();
  const compiledPro = compiledSchedulePlan() === "pro";
  return {
    ...billed,
    allowsSubDaily: billed.allowsSubDaily && compiledPro,
  };
}

async function lookupBillingPlan(): Promise<HostSchedulePlanInfo> {
  const token = vercelBillingToken();
  if (!token) return hobbyDefaultPlan();
  try {
    const orgId = process.env.VERCEL_ORG_ID?.trim() || process.env.VERCEL_TEAM_ID?.trim();
    if (orgId) {
      const team = billingPlanFromPayload(await vercelApiJson(`/v2/teams/${orgId}`, token));
      if (team) return planInfoFor(team, "api");
    }
    const user = billingPlanFromPayload(await vercelApiJson("/v2/user", token));
    if (user) return planInfoFor(user, "api");
  } catch (error) {
    console.warn("[vercel-plan] billing lookup failed; assuming Hobby", error);
  }
  return hobbyDefaultPlan();
}

async function vercelApiJson(pathname: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.vercel.com${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Vercel API ${pathname} returned ${response.status}`);
  }
  return response.json();
}
