import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authOrigins } from "@/lib/auth-origins";

const ORIGIN_ENV_KEYS = ["BETTER_AUTH_URL", "VERCEL_ENV"] as const;

const originalEnv: Partial<Record<(typeof ORIGIN_ENV_KEYS)[number], string | undefined>> = {};

function clearOriginEnv() {
  for (const key of ORIGIN_ENV_KEYS) {
    delete process.env[key];
  }
}

beforeEach(() => {
  for (const key of ORIGIN_ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
  clearOriginEnv();
});

afterEach(() => {
  clearOriginEnv();
  for (const key of ORIGIN_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("authOrigins", () => {
  it("keeps localhost wildcards and omits *.vercel.app when VERCEL_ENV is unset", () => {
    const { hosts, origins, fallback } = authOrigins();

    expect(hosts).toEqual(["localhost:*", "127.0.0.1:*", "localhost"]);
    expect(origins).toEqual([
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://localhost:3000",
    ]);
    expect(fallback).toBe("http://localhost:3000");
    expect(hosts).not.toContain("*.vercel.app");
    expect(origins).not.toContain("https://*.vercel.app");
  });

  it("adds the Vercel preview wildcard when VERCEL_ENV=preview", () => {
    process.env.VERCEL_ENV = "preview";

    const { hosts, origins } = authOrigins();

    expect(hosts).toContain("*.vercel.app");
    expect(origins).toContain("https://*.vercel.app");
  });

  it("pins production to BETTER_AUTH_URL plus localhost, without *.vercel.app", () => {
    process.env.VERCEL_ENV = "production";
    process.env.BETTER_AUTH_URL = "https://app.example.com";

    const { hosts, origins, fallback } = authOrigins();

    expect(hosts).toEqual(["localhost:*", "127.0.0.1:*", "app.example.com"]);
    expect(origins).toEqual([
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://app.example.com",
    ]);
    expect(fallback).toBe("https://app.example.com");
    expect(hosts).not.toContain("*.vercel.app");
    expect(origins).not.toContain("https://*.vercel.app");
  });

  it("does not invent a production host when BETTER_AUTH_URL is unset", () => {
    process.env.VERCEL_ENV = "production";

    const { hosts, origins } = authOrigins();

    expect(hosts).toEqual(["localhost:*", "127.0.0.1:*", "localhost"]);
    expect(origins).toEqual([
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://localhost:3000",
    ]);
    expect(hosts).not.toContain("*.vercel.app");
  });
});
