import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-upload";
import { UPLOAD_FILE_ERROR, uploadFiles } from "@/components/documents-upload";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("uploadFiles", () => {
  it("skips the request when a file is over the shared size cap", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const oversized = { name: "dump.pdf", size: MAX_DOCUMENT_BYTES + 1, type: "application/pdf" } as File;

    const result = await uploadFiles([oversized], { onDocument: vi.fn() });

    expect(result.error).toBe(UPLOAD_FILE_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
