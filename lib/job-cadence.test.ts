import { describe, expect, it } from "vitest";
import { isOneOffJob, onceCadenceFromInstant, parseJobCadence } from "@/lib/job-cadence";

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

describe("isOneOffJob", () => {
  it("treats once cadence as one-off", () => {
    expect(
      isOneOffJob({
        cadence: { kind: "once", timezone: "UTC", at: "2026-09-06T10:00" },
        everyMinutes: null,
      }),
    ).toBe(true);
  });

  it("treats a job with no cadence and no interval as one-off", () => {
    expect(isOneOffJob({ cadence: null, everyMinutes: null })).toBe(true);
  });

  it("does not treat repeating jobs as one-off", () => {
    expect(
      isOneOffJob({
        cadence: { kind: "daily", timezone: "UTC", hour: 9, minute: 0 },
        everyMinutes: 1_440,
      }),
    ).toBe(false);
    expect(isOneOffJob({ cadence: null, everyMinutes: 60 })).toBe(false);
  });
});

describe("onceCadenceFromInstant", () => {
  it("stores the wall time in the given zone", () => {
    expect(onceCadenceFromInstant("2026-09-06T15:00:00-06:00", "America/Denver")).toEqual({
      kind: "once",
      timezone: "America/Denver",
      at: "2026-09-06T15:00",
    });
  });
});
