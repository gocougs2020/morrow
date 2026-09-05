"use client";

import { FileTextIcon, XIcon } from "lucide-react";
import { DocumentEditor } from "@/components/document-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { documentKindLabel } from "@/lib/document-kind";
import { cn } from "@/lib/utils";
import type { ClientDocument } from "@/lib/types";

export function SessionDocumentCanvas({
  documents,
  onClose,
  onOpen,
  onSave,
  openDocument,
  openContent,
  saving,
}: {
  readonly documents: ClientDocument[];
  readonly onClose: () => void;
  readonly onOpen: (document: ClientDocument) => void;
  readonly onSave: (documentId: string, content: string) => void;
  readonly openDocument?: ClientDocument;
  readonly openContent: string;
  readonly saving?: boolean;
}) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-card md:w-[28rem]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="font-medium text-sm">Canvas</p>
          <p className="text-muted-foreground text-xs">
            {saving ? "Saving…" : "Files in this session"}
          </p>
        </div>
        <Button aria-label="Close canvas" size="icon-sm" type="button" variant="ghost" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 max-h-[25%] shrink-0 overflow-hidden border-b">
          <div className="space-y-1 p-2">
            {documents.length === 0 ? (
              <p className="px-2 py-6 text-muted-foreground text-sm">
                No files in this session yet.
              </p>
            ) : (
              documents.map((document) => (
                <button
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                    openDocument?.id === document.id && "bg-accent",
                  )}
                  key={document.id}
                  type="button"
                  onClick={() => onOpen(document)}
                >
                  <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{document.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {documentKindLabel(document.kind)}
                      {document.isPublic ? " · Public" : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        {openDocument ? (
          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="p-3">
              <DocumentEditor
                key={openDocument.id}
                content={openContent}
                disabled={!openDocument.editable}
                fileHref={openDocument.fileHref}
                kind={openDocument.kind}
                shareUrl={openDocument.shareUrl}
                title={openDocument.title}
                onChange={(next) => onSave(openDocument.id, next)}
              />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-muted-foreground text-sm">
            Select a file to view it here.
          </div>
        )}
      </div>
    </aside>
  );
}
