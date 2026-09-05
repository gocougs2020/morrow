import { describe, expect, it } from "vitest";
import { parseJobCadence } from "@/lib/job-cadence";

describe("parseJobCadence", () => {
  it("returns null for an invalid payload", () => {
    expect(parseJobCadence(null)).toBeNull();
    expect(parseJobCadence({})).toBeNull();
    expect(parseJobCadence({ kind: "daily" })).toBeNull();
    expect(parseJobCadence({ kind: "weekly", timezone: "UTC" })).toBeNull();
  });

  it("parses a valid daily cadence", () => {
    expect(
      parseJobCadence({
        kind: "daily",
        timezone: "UTC",
        hour: 9,
        minute: 30,
      }),
    ).toEqual({
      kind: "daily",
      timezone: "UTC",
      hour: 9,
      minute: 30,
    });
  });

  it("parses a valid once cadence", () => {
    expect(
      parseJobCadence({
        kind: "once",
        timezone: "America/New_York",
        at: "2026-09-06T10:00",
      }),
    ).toEqual({
      kind: "once",
      timezone: "America/New_York",
      at: "2026-09-06T10:00",
    });
  });
});
