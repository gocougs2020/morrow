import { describe, expect, it } from "vitest";
import {
  formatReminderContextLines,
  pickReminderContextHits,
  reminderContextPassesFloor,
  reminderSearchQuery,
} from "@/lib/reminder-context";
import type { EmbeddingKind, EmbeddingRecord, EmbeddingSearchHit } from "@/lib/types";

function hit(
  sourceType: "session" | "document",
  kind: EmbeddingKind,
  score: number,
  sourceId = `${sourceType}-1`,
): EmbeddingSearchHit {
  const record: EmbeddingRecord = {
    id: `${sourceId}-${kind}`,
    userId: "user-1",
    kind,
    sourceType,
    sourceId,
    turnId: null,
    text: "Bring the jumper cables and check the AGM battery.",
    embedding: [],
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
  };
  return { record, score };
}

describe("reminderSearchQuery", () => {
  it("drops thin time-only briefs", () => {
    expect(reminderSearchQuery("remind me tomorrow")).toBeNull();
    expect(reminderSearchQuery("nudge me tonight at 5pm")).toBeNull();
    expect(reminderSearchQuery("let me know on Friday")).toBeNull();
  });

  it("keeps a concrete topic", () => {
    expect(reminderSearchQuery("Get a new battery for the car")).toBe("get new battery car");
    expect(reminderSearchQuery("remind me to fold the clothes tomorrow")).toBe("fold clothes");
  });
});

describe("reminderContextPassesFloor", () => {
  it("accepts a title hit at the main floor", () => {
    expect(reminderContextPassesFloor(hit("session", "session_title", 0.74), 0.74, 0.78)).toBe(true);
  });

  it("rejects a body hit below the body floor", () => {
    expect(reminderContextPassesFloor(hit("document", "document_content", 0.75), 0.74, 0.78)).toBe(
      false,
    );
  });

  it("accepts a body hit at the body floor", () => {
    expect(reminderContextPassesFloor(hit("document", "document_content", 0.78), 0.74, 0.78)).toBe(
      true,
    );
  });
});

describe("pickReminderContextHits", () => {
  it("keeps at most one session and one file", () => {
    const picked = pickReminderContextHits(
      [
        hit("session", "session_title", 0.91, "s1"),
        hit("session", "session_title", 0.88, "s2"),
        hit("document", "document_title", 0.86, "d1"),
        hit("document", "document_title", 0.8, "d2"),
      ],
      { minScore: 0.74, bodyMinScore: 0.78 },
    );
    expect(picked.session?.record.sourceId).toBe("s1");
    expect(picked.document?.record.sourceId).toBe("d1");
  });

  it("prefers a title hit over a body hit on the same source", () => {
    const picked = pickReminderContextHits(
      [
        hit("session", "session_prompt", 0.9, "s1"),
        hit("session", "session_title", 0.75, "s1"),
      ],
      { minScore: 0.74, bodyMinScore: 0.78 },
    );
    expect(picked.session?.record.kind).toBe("session_title");
  });

  it("omits a body-only hit that is only barely related", () => {
    const picked = pickReminderContextHits([hit("document", "document_content", 0.75, "d1")], {
      minScore: 0.74,
      bodyMinScore: 0.78,
    });
    expect(picked.document).toBeUndefined();
    expect(picked.session).toBeUndefined();
  });
});

describe("formatReminderContextLines", () => {
  it("joins origin onto relative hrefs", () => {
    expect(
      formatReminderContextLines(
        [
          {
            kind: "session",
            title: "Battery shopping",
            href: "/s/abc",
            snippet: "AGM vs lithium",
            score: 0.9,
          },
        ],
        "https://app.example.com/",
      ),
    ).toBe("Session: Battery shopping (https://app.example.com/s/abc)\nAGM vs lithium");
  });
});
