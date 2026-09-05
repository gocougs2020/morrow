import { describe, expect, it } from "vitest";
import {
  isOwnedBy,
  isVisibleToViewer,
  normalizeLibraryVisibility,
  parseVisibility,
  resolveFileVisibility,
} from "@/lib/visibility";

describe("parseVisibility", () => {
  it("maps legacy account to shared", () => {
    expect(parseVisibility("account")).toBe("shared");
  });

  it("accepts private, shared, and public", () => {
    expect(parseVisibility("private")).toBe("private");
    expect(parseVisibility("shared")).toBe("shared");
    expect(parseVisibility("public")).toBe("public");
  });
});

describe("normalizeLibraryVisibility", () => {
  it("treats an implicit or legacy account value as private", () => {
    expect(normalizeLibraryVisibility(undefined)).toBe("private");
    expect(normalizeLibraryVisibility("account")).toBe("private");
    expect(normalizeLibraryVisibility("private")).toBe("private");
  });

  it("keeps explicit shared and public", () => {
    expect(normalizeLibraryVisibility("shared")).toBe("shared");
    expect(normalizeLibraryVisibility("public")).toBe("public");
    expect(normalizeLibraryVisibility("private", true)).toBe("public");
  });
});

describe("resolveFileVisibility", () => {
  it("resolves the public, shared, and private matrix", () => {
    expect(resolveFileVisibility({ visibility: "public" })).toBe("public");
    expect(resolveFileVisibility({ visibility: "shared" })).toBe("shared");
    expect(resolveFileVisibility({ visibility: "private" })).toBe("private");
    expect(resolveFileVisibility({ visibility: "account" })).toBe("shared");

    expect(resolveFileVisibility({ visibility: "shared", isPublic: true })).toBe("public");
    expect(resolveFileVisibility({ visibility: "public", isPublic: false })).toBe("shared");

    expect(resolveFileVisibility({ isPublic: true })).toBe("public");
    expect(
      resolveFileVisibility({ isPublic: false, currentVisibility: "public" }),
    ).toBe("shared");
    expect(
      resolveFileVisibility({ isPublic: false, currentVisibility: "shared" }),
    ).toBe("shared");
    expect(
      resolveFileVisibility({ isPublic: false, currentVisibility: "private" }),
    ).toBe("private");
    expect(resolveFileVisibility({ currentVisibility: "public" })).toBe("public");
    expect(resolveFileVisibility({})).toBe("private");
  });
});

describe("isOwnedBy and isVisibleToViewer", () => {
  const owner = { userId: "user-1", visibility: "private" as const };
  const shared = { userId: "user-1", visibility: "shared" as const };
  const published = { userId: "user-1", visibility: "public" as const };

  it("treats the owner as the only owner", () => {
    expect(isOwnedBy(owner, "user-1")).toBe(true);
    expect(isOwnedBy(owner, "user-2")).toBe(false);
  });

  it("shows private files only to the owner and shared or public files to anyone", () => {
    expect(isVisibleToViewer(owner, "user-1")).toBe(true);
    expect(isVisibleToViewer(owner, "user-2")).toBe(false);
    expect(isVisibleToViewer(shared, "user-2")).toBe(true);
    expect(isVisibleToViewer(published, "user-2")).toBe(true);
  });
});
