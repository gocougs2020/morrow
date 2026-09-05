const EXECUTABLE_MIME = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/xml",
  "application/xml",
]);

export function downloadSafeContentType(mimeType: string | undefined): string {
  const mime =
    (mimeType ?? "application/octet-stream").split(";")[0]?.trim().toLowerCase() ||
    "application/octet-stream";
  if (EXECUTABLE_MIME.has(mime) || mime.endsWith("+xml")) return "application/octet-stream";
  return mime;
}

export function fileContentDisposition(filename: string, download: boolean): string {
  const mode = download ? "attachment" : "inline";
  const fallback = asciiFilename(filename);
  const encoded = encodeRFC5987(filename);
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function asciiFilename(value: string): string {
  const base =
    value.replace(/[\r\n\\/"]/g, "").replace(/[^\x20-\x7E]/g, "_").trim() || "download";
  return base.slice(0, 120);
}

function encodeRFC5987(value: string): string {
  return encodeURIComponent(value.normalize("NFC"))
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}
