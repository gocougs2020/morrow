import { MAX_DOCUMENT_BYTES } from "@/lib/document-upload";
import type { ClientDocument } from "@/lib/types";

export const UPLOAD_FILE_ERROR = "Unable to upload that file.";

export async function uploadFiles(
  files: FileList | File[] | null,
  options: {
    folderId?: string | null;
    onDocument: (document: ClientDocument) => void;
  },
): Promise<{ error?: string }> {
  const list = files ? Array.from(files) : [];
  if (list.length === 0) return {};

  for (const file of list) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { error: UPLOAD_FILE_ERROR };
    }
    const body = new FormData();
    body.append("file", file);
    body.append("title", file.name.replace(/\.[^.]+$/, "") || file.name);
    body.append("filename", file.name);
    body.append("mimeType", file.type);
    if (options.folderId) body.append("folderId", options.folderId);
    const response = await fetch("/api/documents", { method: "POST", body });
    if (!response.ok) {
      return { error: UPLOAD_FILE_ERROR };
    }
    const payload = (await response.json()) as { document: ClientDocument };
    options.onDocument(payload.document);
  }

  return {};
}
