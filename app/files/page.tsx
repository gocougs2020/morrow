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

  let library;
  try {
    library = await getDocumentLibrary(session.user.id, folderId);
  } catch (error) {
    if (error instanceof DocumentError && error.status === 404) {
      library = await getDocumentLibrary(session.user.id);
    } else {
      throw error;
    }
  }

  return <DocumentsLibrary library={library} />;
}
