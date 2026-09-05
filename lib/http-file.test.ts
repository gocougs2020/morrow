import { describe, expect, it } from "vitest";
import { downloadSafeContentType, fileContentDisposition } from "@/lib/http-file";

describe("downloadSafeContentType", () => {
  it("rewrites executable MIME types to octet-stream", () => {
    expect(downloadSafeContentType("text/html")).toBe("application/octet-stream");
    expect(downloadSafeContentType("application/xhtml+xml")).toBe("application/octet-stream");
    expect(downloadSafeContentType("image/svg+xml")).toBe("application/octet-stream");
    expect(downloadSafeContentType("application/rdf+xml")).toBe("application/octet-stream");
    expect(downloadSafeContentType("image/png")).toBe("image/png");
  });
});

describe("fileContentDisposition", () => {
  it("strips CR and LF from a hostile filename", () => {
    const header = fileContentDisposition('evil\r\nfilename="hacked.exe"', true);
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.startsWith("attachment;")).toBe(true);
  });
});
