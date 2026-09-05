import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { DocumentViewer } from "@/components/document-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentKindLabel, isTextDocumentKind } from "@/lib/document-kind";
import { DocumentError, getSharedDocument, publicFileHref, readDocumentText } from "@/lib/documents";
import { downloadSafeContentType } from "@/lib/http-file";
import { APP_NAME } from "@/lib/brand";
import { getSession } from "@/lib/session";
import { formatBytes } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  try {
    const document = await getSharedDocument(shareId);
    return { title: document.title };
  } catch {
    return { title: "File" };
  }
}

export default async function SharedDocumentPage({
  params,
}: {
  readonly params: Promise<{ readonly shareId: string }>;
}) {
  const { shareId } = await params;
  const session = await getSession();

  let document;
  try {
    document = await getSharedDocument(shareId);
  } catch (error) {
    if (error instanceof DocumentError && error.status === 404) notFound();
    throw error;
  }

  const fileHref = publicFileHref(shareId);
  const previewKind =
    document.kind === "image" && downloadSafeContentType(document.mimeType) === "application/octet-stream"
      ? "other"
      : document.kind;
  const content = isTextDocumentKind(previewKind)
    ? await readDocumentText(document).catch(() => "")
    : "";

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border px-4 py-3">
        {session ? (
          <Link
            aria-label="Back to Files"
            className="mb-2 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
            href="/files"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Files
          </Link>
        ) : null}
        <p className="text-muted-foreground text-xs">{APP_NAME}</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="min-w-0 flex-1 text-pretty font-medium text-lg tracking-tight">
            {document.title}
          </h1>
          <Button asChild size="sm" variant="outline">
            <a aria-label="Download file" href={`${fileHref}?download=1`}>
              <DownloadIcon /> Download
            </a>
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <Badge variant="secondary">{documentKindLabel(document.kind)}</Badge>
          <span>{formatBytes(document.size)}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6" id="main" tabIndex={-1}>
        <DocumentViewer
          content={content}
          fileHref={fileHref}
          kind={previewKind}
          title={document.title}
        />
      </main>
    </div>
  );
}
