export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_TOO_LARGE_MESSAGE = "File is too large (max 15 MB).";

const ALLOWED_MIME = [
  "application/json",
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
];
const ALLOWED_EXT = [
  "md",
  "markdown",
  "txt",
  "csv",
  "json",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "html",
  "htm",
];

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DocumentUploadError";
  }
}

export function isAllowedUpload(file: { size: number; type: string; name: string }): boolean {
  try {
    assertDocumentUpload(file);
    return true;
  } catch {
    return false;
  }
}

export function assertDocumentUpload(file: { size: number; type: string; name: string }) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentUploadError(DOCUMENT_TOO_LARGE_MESSAGE, 413);
  }
  const mime = file.type.split(";")[0]?.trim().toLowerCase() || "";
  const ext = file.name.includes(".") ? (file.name.split(".").pop()?.toLowerCase() ?? "") : "";
  if (mime === "image/svg+xml" || ext === "svg") {
    throw new DocumentUploadError("SVG uploads are not allowed.", 415);
  }
  const extOk = ALLOWED_EXT.includes(ext);
  const mimeMissing = !mime || mime === "application/octet-stream";
  const mimeOk = ALLOWED_MIME.includes(mime);
  const allowed = mimeMissing ? extOk : mimeOk && (!ext || extOk);
  if (!allowed) {
    throw new DocumentUploadError("That file type is not allowed.", 415);
  }
}

export function assertDocumentByteLength(byteLength: number) {
  if (byteLength > MAX_DOCUMENT_BYTES) {
    throw new DocumentUploadError(DOCUMENT_TOO_LARGE_MESSAGE, 413);
  }
}
