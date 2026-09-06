import { describe, expect, it } from "vitest";
import { isSelfSendTarget } from "./identity";

describe("isSelfSendTarget", () => {
  it("treats omitted and me-aliases as self", () => {
    expect(isSelfSendTarget(undefined)).toBe(true);
    expect(isSelfSendTarget("")).toBe(true);
    expect(isSelfSendTarget("me")).toBe(true);
    expect(isSelfSendTarget("my email")).toBe(true);
  });

  it("treats a named address as someone else", () => {
    expect(isSelfSendTarget("ada@example.com")).toBe(false);
  });
});
