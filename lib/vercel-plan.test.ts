import { afterEach, describe, expect, it } from "vitest";
import {
  billingPlanFromPayload,
  cadenceFiresMoreThanOncePerDay,
  hobbyDefaultPlan,
  isPaidVercelPlan,
  parseVercelBillingPlan,
  resetHostSchedulePlanCache,
  resolveHostSchedulePlan,
  scheduleDispatcherCron,
  schedulePlanInstruction,
  vercelBillingToken,
} from "@/lib/vercel-plan";

const KEYS = ["VERCEL_TOKEN", "VERCEL_ACCESS_TOKEN", "VERCEL_BILLING_PLAN"] as const;
const original: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function env() {
  return process.env as Record<string, string | undefined>;
}

for (const key of KEYS) {
  original[key] = process.env[key];
}

afterEach(() => {
  resetHostSchedulePlanCache();
  const store = env();
  for (const key of KEYS) {
    if (original[key] === undefined) delete store[key];
    else store[key] = original[key];
  }
});

describe("parseVercelBillingPlan", () => {
  it("treats enterprise as pro and unknown as missing", () => {
    expect(parseVercelBillingPlan("hobby")).toBe("hobby");
    expect(parseVercelBillingPlan("pro")).toBe("pro");
    expect(parseVercelBillingPlan("enterprise")).toBe("pro");
    expect(parseVercelBillingPlan("free")).toBeNull();
    expect(isPaidVercelPlan("enterprise")).toBe(true);
    expect(isPaidVercelPlan("hobby")).toBe(false);
  });

  it("reads billing.plan from team or user payloads", () => {
    expect(billingPlanFromPayload({ billing: { plan: "pro" } })).toBe("pro");
    expect(billingPlanFromPayload({ user: { billing: { plan: "hobby" } } })).toBe("hobby");
    expect(billingPlanFromPayload({})).toBeNull();
  });
});

describe("cadenceFiresMoreThanOncePerDay", () => {
  it("flags hourly and short intervals only", () => {
    expect(cadenceFiresMoreThanOncePerDay({ kind: "hourly", timezone: "UTC", minute: 0 })).toBe(true);
    expect(
      cadenceFiresMoreThanOncePerDay({ kind: "interval", timezone: "UTC", everyMinutes: 60 }),
    ).toBe(true);
    expect(
      cadenceFiresMoreThanOncePerDay({ kind: "interval", timezone: "UTC", everyMinutes: 1_440 }),
    ).toBe(false);
    expect(
      cadenceFiresMoreThanOncePerDay({ kind: "daily", timezone: "UTC", hour: 9, minute: 0 }),
    ).toBe(false);
    expect(
      cadenceFiresMoreThanOncePerDay({
        kind: "weekly",
        timezone: "UTC",
        weekdays: [1, 2, 3, 4, 5],
        hour: 9,
        minute: 0,
      }),
    ).toBe(false);
    expect(cadenceFiresMoreThanOncePerDay(null, 30)).toBe(true);
    expect(cadenceFiresMoreThanOncePerDay(null, 1_440)).toBe(false);
  });
});

describe("resolveHostSchedulePlan", () => {
  it("assumes Hobby when no billing token is set", async () => {
    delete env().VERCEL_TOKEN;
    delete env().VERCEL_ACCESS_TOKEN;
    expect(vercelBillingToken()).toBeNull();
    await expect(resolveHostSchedulePlan()).resolves.toEqual(hobbyDefaultPlan());
  });

  it("does not unlock sub-daily jobs from a compile snapshot alone", async () => {
    delete env().VERCEL_TOKEN;
    delete env().VERCEL_ACCESS_TOKEN;
    env().VERCEL_BILLING_PLAN = "pro";
    await expect(resolveHostSchedulePlan()).resolves.toEqual({
      plan: "hobby",
      source: "default",
      allowsSubDaily: false,
    });
  });
});

describe("scheduleDispatcherCron", () => {
  it("uses a daily cron unless the build snapshot is pro", () => {
    delete env().VERCEL_BILLING_PLAN;
    expect(scheduleDispatcherCron()).toBe("0 0 * * *");
    env().VERCEL_BILLING_PLAN = "pro";
    expect(scheduleDispatcherCron()).toBe("* * * * *");
  });
});

describe("schedulePlanInstruction", () => {
  it("tells the agent not to create sub-daily jobs on Hobby", () => {
    expect(schedulePlanInstruction(hobbyDefaultPlan())).toContain("at most once a day");
    expect(
      schedulePlanInstruction({ plan: "pro", source: "api", allowsSubDaily: true }),
    ).toContain("hourly");
    expect(
      schedulePlanInstruction({ plan: "pro", source: "api", allowsSubDaily: false }),
    ).toContain("redeploy");
  });
});
