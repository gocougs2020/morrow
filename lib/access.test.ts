import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canViewAccountUsage,
  isAccessEmailAllowed,
} from "@/lib/access";

const ACCESS_ENV_KEYS = [
  "ALLOWED_SIGNUP_EMAILS",
  "ALLOWED_SIGNUP_DOMAINS",
  "BLOCKED_ACCESS_EMAILS",
  "ALLOWED_ACCOUNT_USAGE_EMAILS",
] as const;

const originalEnv: Partial<Record<(typeof ACCESS_ENV_KEYS)[number], string | undefined>> = {};

function clearAccessEnv() {
  for (const key of ACCESS_ENV_KEYS) {
    delete process.env[key];
  }
}

beforeEach(() => {
  for (const key of ACCESS_ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
  clearAccessEnv();
});

afterEach(() => {
  clearAccessEnv();
  for (const key of ACCESS_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("isAccessEmailAllowed", () => {
  it("allows any email when the allowlist is empty, except blocked addresses", () => {
    expect(isAccessEmailAllowed("anyone@example.com")).toBe(true);
    expect(isAccessEmailAllowed("other@elsewhere.org")).toBe(true);

    process.env.BLOCKED_ACCESS_EMAILS = "blocked@example.com";
    expect(isAccessEmailAllowed("blocked@example.com")).toBe(false);
    expect(isAccessEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("allows only exact emails on the email allowlist", () => {
    process.env.ALLOWED_SIGNUP_EMAILS = "alice@example.com";
    expect(isAccessEmailAllowed("alice@example.com")).toBe(true);
    expect(isAccessEmailAllowed("bob@example.com")).toBe(false);
    expect(isAccessEmailAllowed("alice@other.com")).toBe(false);
  });

  it("allows a domain with or without a leading @", () => {
    process.env.ALLOWED_SIGNUP_DOMAINS = "example.com";
    expect(isAccessEmailAllowed("alice@example.com")).toBe(true);
    expect(isAccessEmailAllowed("bob@other.com")).toBe(false);

    process.env.ALLOWED_SIGNUP_DOMAINS = "@example.com";
    expect(isAccessEmailAllowed("alice@example.com")).toBe(true);
    expect(isAccessEmailAllowed("bob@other.com")).toBe(false);
  });

  it("lets a blocked email win over email and domain allowlists", () => {
    process.env.ALLOWED_SIGNUP_EMAILS = "alice@example.com";
    process.env.ALLOWED_SIGNUP_DOMAINS = "example.com";
    process.env.BLOCKED_ACCESS_EMAILS = "alice@example.com";
    expect(isAccessEmailAllowed("alice@example.com")).toBe(false);
    expect(isAccessEmailAllowed("bob@example.com")).toBe(true);
  });

  it("folds email and domain case when matching", () => {
    process.env.ALLOWED_SIGNUP_EMAILS = "alice@example.com";
    process.env.ALLOWED_SIGNUP_DOMAINS = "Allowed.org";
    expect(isAccessEmailAllowed("Alice@Example.COM")).toBe(true);
    expect(isAccessEmailAllowed("pat@ALLOWED.org")).toBe(true);
  });
});

describe("canViewAccountUsage", () => {
  it("denies every email when the usage allowlist is empty", () => {
    expect(canViewAccountUsage("admin@example.com")).toBe(false);
  });

  it("allows only listed usage emails", () => {
    process.env.ALLOWED_ACCOUNT_USAGE_EMAILS = "admin@example.com";
    expect(canViewAccountUsage("admin@example.com")).toBe(true);
    expect(canViewAccountUsage("ADMIN@example.com")).toBe(true);
    expect(canViewAccountUsage("other@example.com")).toBe(false);
  });
});
