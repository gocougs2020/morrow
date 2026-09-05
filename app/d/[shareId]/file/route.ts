import { DocumentError, getSharedDocument, readDocumentBytes } from "@/lib/documents";
import { downloadSafeContentType, fileContentDisposition } from "@/lib/http-file";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  try {
    const document = await getSharedDocument(shareId);
    const { buffer, contentType: storedType } = await readDocumentBytes(document);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const contentType = downloadSafeContentType(storedType);
    const forceDownload = download || contentType === "application/octet-stream";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Disposition": fileContentDisposition(document.filename, forceDownload),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (documentError) {
    if (documentError instanceof DocumentError) {
      return Response.json({ error: documentError.message }, { status: documentError.status });
    }
    throw documentError;
  }
}
