import type { ClientDocument } from "@/lib/types";

export const DOCUMENT_TOOLS = new Set([
  "create_document",
  "update_document",
  "attach_document",
  "read_document",
  "list_documents",
]);

export function isClientDocument(value: unknown): value is ClientDocument {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof value.id === "string" &&
      "title" in value &&
      typeof value.title === "string" &&
      "href" in value &&
      typeof value.href === "string" &&
      "kind" in value &&
      typeof value.kind === "string",
  );
}

export function documentsFromToolOutput(output: unknown): ClientDocument[] {
  if (isClientDocument(output)) return [output];
  if (!output || typeof output !== "object") return [];

  if ("document" in output && isClientDocument(output.document)) {
    return [output.document];
  }

  if ("documents" in output && Array.isArray(output.documents)) {
    return output.documents.filter(isClientDocument);
  }

  if (Array.isArray(output)) {
    return output.filter(isClientDocument);
  }

  return [];
}
