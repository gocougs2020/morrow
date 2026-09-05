import { AuthForm } from "@/components/auth-form";
import { DocumentsLibrary } from "@/components/documents-library";
import { DocumentError, getDocumentLibrary } from "@/lib/documents";
import { getSession } from "@/lib/session";

export default async function FilesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly folder?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) {
    return <AuthForm mode="sign-in" />;
  }

  const query = await searchParams;
  const folderId = Array.isArray(query.folder) ? query.folder[0] : query.folder;

  try {
    return <DocumentsLibrary library={await getDocumentLibrary(session.user.id, folderId)} />;
  } catch (error) {
    if (error instanceof DocumentError && error.status === 404) {
      return <DocumentsLibrary library={await getDocumentLibrary(session.user.id)} />;
    }
    throw error;
  }
}
