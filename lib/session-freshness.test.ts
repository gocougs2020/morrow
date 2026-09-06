import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionWorkspaceLeft,
  consumeExplicitSessionOpen,
  hrefOpensExistingSession,
  isSessionViewStale,
  markExplicitSessionOpen,
  markSessionWorkspaceLeft,
  readLastLeftAt,
  SESSION_STALE_AFTER_MS,
  sessionIdFromPath,
  shouldResetStaleSession,
} from "@/lib/session-freshness";

describe("sessionIdFromPath", () => {
  it("reads a session id and ignores the new-session path", () => {
    expect(sessionIdFromPath("/s/chat-1")).toBe("chat-1");
    expect(sessionIdFromPath("/s/chat-1?docs=1")).toBe("chat-1");
    expect(sessionIdFromPath("/s")).toBeUndefined();
    expect(sessionIdFromPath("/s/")).toBeUndefined();
    expect(sessionIdFromPath("/inbox")).toBeUndefined();
  });
});

describe("isSessionViewStale", () => {
  const now = 1_000_000;

  it("is not stale when the user has never left", () => {
    expect(isSessionViewStale(null, now)).toBe(false);
  });

  it("is stale at the five-minute mark and after", () => {
    expect(isSessionViewStale(now - SESSION_STALE_AFTER_MS, now)).toBe(true);
    expect(isSessionViewStale(now - SESSION_STALE_AFTER_MS - 1, now)).toBe(true);
  });

  it("is not stale before five minutes", () => {
    expect(isSessionViewStale(now - SESSION_STALE_AFTER_MS + 1, now)).toBe(false);
  });
});

describe("shouldResetStaleSession", () => {
  const now = 1_000_000;
  const stale = now - SESSION_STALE_AFTER_MS;

  it("resets a resumed session after five minutes away", () => {
    expect(
      shouldResetStaleSession({
        sessionId: "chat-1",
        lastLeftAt: stale,
        now,
      }),
    ).toBe(true);
  });

  it("keeps a new-session path and an explicit session open", () => {
    expect(
      shouldResetStaleSession({
        lastLeftAt: stale,
        now,
      }),
    ).toBe(false);
    expect(
      shouldResetStaleSession({
        sessionId: "chat-1",
        lastLeftAt: stale,
        now,
        explicitOpen: true,
      }),
    ).toBe(false);
  });
});

describe("hrefOpensExistingSession", () => {
  it("treats same-origin session links as an explicit open", () => {
    expect(hrefOpensExistingSession("/s/chat-1", "https://app.example.com")).toBe(true);
    expect(hrefOpensExistingSession("/s", "https://app.example.com")).toBe(false);
    expect(hrefOpensExistingSession("https://other.example/s/chat-1", "https://app.example.com")).toBe(
      false,
    );
  });
});

describe("session freshness storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips last-left and consumes an explicit open once", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => {
          store.delete(key);
        },
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });

    expect(readLastLeftAt()).toBeNull();
    markSessionWorkspaceLeft(42);
    expect(readLastLeftAt()).toBe(42);
    clearSessionWorkspaceLeft();
    expect(readLastLeftAt()).toBeNull();

    expect(consumeExplicitSessionOpen()).toBe(false);
    markExplicitSessionOpen();
    expect(consumeExplicitSessionOpen()).toBe(true);
    expect(consumeExplicitSessionOpen()).toBe(false);
  });
});
