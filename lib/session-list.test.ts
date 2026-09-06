import { describe, expect, it } from "vitest";
import { filterSessionList, isScheduledChat } from "@/lib/session-list";

function chat(id: string, source: "web" | "email" | "schedule") {
  return { id, source };
}

describe("isScheduledChat", () => {
  it("treats schedule as scheduled", () => {
    expect(isScheduledChat({ source: "schedule" })).toBe(true);
  });

  it("does not treat web or email as scheduled", () => {
    expect(isScheduledChat({ source: "web" })).toBe(false);
    expect(isScheduledChat({ source: "email" })).toBe(false);
  });
});

describe("filterSessionList", () => {
  const chats = [chat("a", "web"), chat("b", "schedule"), chat("c", "email")];

  it("hides scheduled runs by default", () => {
    expect(filterSessionList(chats, { includeScheduled: false }).map((row) => row.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("keeps the open scheduled session visible while others stay hidden", () => {
    expect(
      filterSessionList(chats, { includeScheduled: false, alwaysIncludeId: "b" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("includes scheduled runs when asked", () => {
    expect(filterSessionList(chats, { includeScheduled: true }).map((row) => row.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("hides scheduled hits in search unless they are included or open", () => {
    const hits = [chat("b", "schedule"), chat("c", "email")];
    expect(filterSessionList(hits, { includeScheduled: false }).map((row) => row.id)).toEqual(["c"]);
    expect(
      filterSessionList(hits, { includeScheduled: false, alwaysIncludeId: "b" }).map((row) => row.id),
    ).toEqual(["b", "c"]);
  });
});
