import { describe, expect, it } from "vitest";
import { fromMatchesAccount, normalizeEmailAddress, parseAddressList } from "@/lib/email-users";

describe("normalizeEmailAddress", () => {
  it("uses the address inside angle brackets", () => {
    expect(normalizeEmailAddress("Ada Lovelace <ada@example.com>")).toBe("ada@example.com");
  });
});

describe("parseAddressList", () => {
  it("splits comma-separated values", () => {
    expect(parseAddressList("ada@example.com, Sam <sam@example.com>")).toEqual([
      "ada@example.com",
      "sam@example.com",
    ]);
  });
});

describe("fromMatchesAccount", () => {
  it("matches the account email, including a display name", () => {
    expect(fromMatchesAccount("Ada <ada@example.com>", "ada@example.com")).toBe(true);
    expect(fromMatchesAccount("mallory@example.com", "ada@example.com")).toBe(false);
    expect(fromMatchesAccount("", "ada@example.com")).toBe(false);
  });
});

