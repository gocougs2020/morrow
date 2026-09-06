import { describe, expect, it } from "vitest";
import { isAppNavActive } from "@/lib/app-nav";

describe("isAppNavActive", () => {
  it("treats Settings as an exact match so Setup can highlight separately", () => {
    expect(isAppNavActive("/settings", "/settings")).toBe(true);
    expect(isAppNavActive("/settings/setup", "/settings")).toBe(false);
    expect(isAppNavActive("/settings/setup", "/settings/setup")).toBe(true);
  });

  it("still highlights nested Files and Inbox routes", () => {
    expect(isAppNavActive("/files/abc", "/files")).toBe(true);
    expect(isAppNavActive("/inbox/abc", "/inbox")).toBe(true);
    expect(isAppNavActive("/", "/")).toBe(true);
    expect(isAppNavActive("/s/abc", "/")).toBe(false);
  });
});
