import { afterEach, describe, expect, it } from "vitest";
import { appOrigin, scheduleDispatchSecret } from "@/lib/dispatch-jobs";
import { normalizeChatSource } from "@/lib/types";

const KEYS = [
  "EMAIL_SESSION_SECRET",
  "RESEND_WEBHOOK_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const original: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function env() {
  return process.env as Record<string, string | undefined>;
}

afterEach(() => {
  const store = env();
  for (const key of KEYS) {
    if (original[key] === undefined) delete store[key];
    else store[key] = original[key];
  }
});

for (const key of KEYS) {
  original[key] = process.env[key];
}

describe("scheduleDispatchSecret", () => {
  it("prefers EMAIL_SESSION_SECRET", () => {
    env().EMAIL_SESSION_SECRET = "email";
    env().BETTER_AUTH_SECRET = "auth";
    expect(scheduleDispatchSecret()).toBe("email");
  });

  it("falls back to BETTER_AUTH_SECRET", () => {
    delete env().EMAIL_SESSION_SECRET;
    delete env().RESEND_WEBHOOK_SECRET;
    env().BETTER_AUTH_SECRET = "auth";
    expect(scheduleDispatchSecret()).toBe("auth");
  });
});

describe("appOrigin", () => {
  it("uses BETTER_AUTH_URL when set", () => {
    env().BETTER_AUTH_URL = "https://app.example.com/";
    expect(appOrigin()).toBe("https://app.example.com");
  });

  it("falls back to the Vercel production host", () => {
    delete env().BETTER_AUTH_URL;
    env().VERCEL_PROJECT_PRODUCTION_URL = "app.vercel.app";
    env().VERCEL_URL = "preview.vercel.app";
    expect(appOrigin()).toBe("https://app.vercel.app");
  });
});

describe("normalizeChatSource", () => {
  it("keeps schedule sessions labeled as schedule", () => {
    expect(normalizeChatSource("schedule")).toBe("schedule");
  });
});
