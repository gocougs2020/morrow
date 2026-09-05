import { describe, expect, it } from "vitest";
import { generateAuthSecret, isAuthSecretConfigured } from "@/lib/auth-secret";

describe("generateAuthSecret", () => {
  it("returns unique base64 strings of openssl-rand strength", () => {
    const first = generateAuthSecret();
    const second = generateAuthSecret();
    expect(first).not.toBe(second);
    expect(Buffer.from(first, "base64")).toHaveLength(32);
    expect(Buffer.from(second, "base64")).toHaveLength(32);
  });
});

describe("isAuthSecretConfigured", () => {
  it("treats missing or blank values as unset", () => {
    expect(isAuthSecretConfigured(undefined)).toBe(false);
    expect(isAuthSecretConfigured("")).toBe(false);
    expect(isAuthSecretConfigured("   ")).toBe(false);
    expect(isAuthSecretConfigured("not-blank")).toBe(true);
  });
});
