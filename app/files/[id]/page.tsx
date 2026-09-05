import { notFound } from "next/navigation";
import { DocumentWorkspace } from "@/components/document-workspace";
import { isTextDocumentKind } from "@/lib/document-kind";
import { DocumentError, documentWithChats, getUserDocument, readDocumentText } from "@/lib/documents";
import { requireSession } from "@/lib/session";

export default async function FilePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  let chats;
  let document;
  let record;
  try {
    [{ chats, document }, record] = await Promise.all([
      documentWithChats(session.user.id, id),
      getUserDocument(session.user.id, id),
    ]);
  } catch (error) {
    if (error instanceof DocumentError && error.status === 404) notFound();
    throw error;
  }

  const content = isTextDocumentKind(record.kind)
    ? await readDocumentText(record).catch(() => "")
    : "";
  return <DocumentWorkspace chats={chats} document={document} initialContent={content} />;
}
