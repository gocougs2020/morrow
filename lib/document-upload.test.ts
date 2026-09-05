import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TOO_LARGE_MESSAGE,
  DocumentUploadError,
  MAX_DOCUMENT_BYTES,
  assertDocumentByteLength,
  assertDocumentUpload,
  isAllowedUpload,
} from "@/lib/document-upload";

function upload(partial: { name?: string; size?: number; type?: string }) {
  return {
    name: partial.name ?? "note.md",
    size: partial.size ?? 12,
    type: partial.type ?? "text/markdown",
  };
}

describe("assertDocumentUpload", () => {
  it("rejects files over 15 MB with 413", () => {
    expect(() => assertDocumentUpload(upload({ size: MAX_DOCUMENT_BYTES + 1 }))).toThrow(
      DocumentUploadError,
    );
    try {
      assertDocumentUpload(upload({ size: MAX_DOCUMENT_BYTES + 1 }));
    } catch (error) {
      expect(error).toMatchObject({ message: DOCUMENT_TOO_LARGE_MESSAGE, status: 413 });
    }
  });

  it("rejects SVG by extension or MIME with 415", () => {
    expect(() => assertDocumentUpload(upload({ name: "icon.svg", type: "image/png" }))).toThrow(
      /SVG uploads are not allowed/,
    );
    expect(() =>
      assertDocumentUpload(upload({ name: "icon.png", type: "image/svg+xml" })),
    ).toThrow(/SVG uploads are not allowed/);
    try {
      assertDocumentUpload(upload({ name: "icon.svg", type: "" }));
    } catch (error) {
      expect(error).toMatchObject({ status: 415 });
    }
  });

  it("allows markdown, png, and pdf under the cap", () => {
    expect(() => assertDocumentUpload(upload({ name: "brief.md", type: "text/markdown" }))).not.toThrow();
    expect(() => assertDocumentUpload(upload({ name: "photo.png", type: "image/png" }))).not.toThrow();
    expect(() =>
      assertDocumentUpload(upload({ name: "quote.pdf", type: "application/pdf" })),
    ).not.toThrow();
    expect(() => assertDocumentUpload(upload({ name: "notes.md", type: "" }))).not.toThrow();
  });

  it("rejects unknown types when neither extension nor MIME is allowed", () => {
    expect(() => assertDocumentUpload(upload({ name: "payload.exe", type: "" }))).toThrow(
      /That file type is not allowed/,
    );
    expect(isAllowedUpload(upload({ name: "payload.exe", type: "application/x-msdownload" }))).toBe(
      false,
    );
    expect(isAllowedUpload(upload({ name: "brief.md", type: "" }))).toBe(true);
  });

  it("rejects script-like text MIME even when the extension is allowed", () => {
    expect(
      isAllowedUpload(upload({ name: "notes.txt", type: "text/javascript" })),
    ).toBe(false);
    expect(
      isAllowedUpload(upload({ name: "app.js", type: "text/javascript" })),
    ).toBe(false);
    expect(
      isAllowedUpload(upload({ name: "app.js", type: "application/javascript" })),
    ).toBe(false);
    expect(isAllowedUpload(upload({ name: "styles.css", type: "text/css" }))).toBe(false);
  });

  it("still allows empty or octet-stream MIME when the extension is on the list", () => {
    expect(isAllowedUpload(upload({ name: "brief.md", type: "application/octet-stream" }))).toBe(
      true,
    );
    expect(isAllowedUpload(upload({ name: "data.csv", type: "text/csv" }))).toBe(true);
    expect(isAllowedUpload(upload({ name: "page.html", type: "text/html" }))).toBe(true);
  });
});

describe("assertDocumentByteLength", () => {
  it("caps JSON and agent-created text at 15 MB", () => {
    expect(() => assertDocumentByteLength(MAX_DOCUMENT_BYTES)).not.toThrow();
    expect(() => assertDocumentByteLength(MAX_DOCUMENT_BYTES + 1)).toThrow(DocumentUploadError);
  });
});
