import { isTextDocumentKind } from "@/lib/document-kind";
import { embedTexts } from "@/lib/embeddings";
import { deleteEmbeddingsForSource, upsertEmbedding } from "@/lib/store";
import { runWithUsageScope } from "@/lib/usage-scope";
import type { DocumentFolder, DocumentRecord, EmbeddingKind } from "@/lib/types";

export const DOCUMENT_EMBEDDING_KINDS = [
  "document_title",
  "document_content",
] as const satisfies readonly EmbeddingKind[];

export const FOLDER_EMBEDDING_KINDS = [
  "folder_name",
  "folder_description",
] as const satisfies readonly EmbeddingKind[];

export const LIBRARY_EMBEDDING_KINDS = [
  ...DOCUMENT_EMBEDDING_KINDS,
  ...FOLDER_EMBEDDING_KINDS,
] as const satisfies readonly EmbeddingKind[];

export const DOCUMENT_SEARCH_MIN_SCORE = 0.32;

function titleEmbedText(document: Pick<DocumentRecord, "title" | "filename">): string {
  const title = document.title.trim();
  const filename = document.filename.trim();
  if (!filename || filename === title) return title;
  return `${title}\n${filename}`;
}

export async function persistDocumentEmbeddings(
  document: DocumentRecord,
  options?: { content?: string; titleOnly?: boolean },
): Promise<void> {
  try {
    const titleText = titleEmbedText(document);
    const contentText =
      options?.titleOnly || !isTextDocumentKind(document.kind)
        ? ""
        : (options?.content ?? "").trim();
    const [titleEmbedding, contentEmbedding] = await runWithUsageScope(
      { userId: document.userId },
      () => embedTexts([titleText, contentText]),
    );
    if (titleEmbedding && titleText) {
      await upsertEmbedding({
        userId: document.userId,
        kind: "document_title",
        sourceType: "document",
        sourceId: document.id,
        turnId: null,
        text: titleText,
        embedding: titleEmbedding,
      });
    }
    if (contentEmbedding && contentText) {
      await upsertEmbedding({
        userId: document.userId,
        kind: "document_content",
        sourceType: "document",
        sourceId: document.id,
        turnId: null,
        text: contentText,
        embedding: contentEmbedding,
      });
    }
  } catch (error) {
    console.error("[documents] embedding failed", { documentId: document.id, error });
  }
}

export async function persistFolderEmbeddings(folder: DocumentFolder): Promise<void> {
  try {
    const name = folder.name.trim();
    const description = folder.description.trim();
    const [nameEmbedding, descriptionEmbedding] = await runWithUsageScope(
      { userId: folder.userId },
      () => embedTexts([name, description]),
    );
    if (nameEmbedding && name) {
      await upsertEmbedding({
        userId: folder.userId,
        kind: "folder_name",
        sourceType: "folder",
        sourceId: folder.id,
        turnId: null,
        text: name,
        embedding: nameEmbedding,
      });
    }
    if (descriptionEmbedding && description) {
      await upsertEmbedding({
        userId: folder.userId,
        kind: "folder_description",
        sourceType: "folder",
        sourceId: folder.id,
        turnId: null,
        text: description,
        embedding: descriptionEmbedding,
      });
    }
  } catch (error) {
    console.error("[documents] folder embedding failed", { folderId: folder.id, error });
  }
}

export async function removeDocumentEmbeddings(userId: string, documentId: string): Promise<void> {
  await deleteEmbeddingsForSource(userId, "document", documentId);
}
