"use client";

import { CheckIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { CsvEditor } from "@/components/csv-editor";
import { DocumentViewer } from "@/components/document-viewer";
import { MarkdownSourceEditor } from "@/components/markdown-source-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isEditableDocumentKind } from "@/lib/document-kind";
import type { DocumentKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DocumentEditor({
  content,
  disabled,
  fileHref,
  fillHeight,
  kind,
  onChange,
  shareUrl,
  title,
}: {
  readonly content: string;
  readonly disabled?: boolean;
  readonly fileHref: string;
  readonly fillHeight?: boolean;
  readonly kind: DocumentKind;
  readonly onChange: (content: string) => void;
  readonly shareUrl?: string | null;
  readonly title: string;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = !disabled && isEditableDocumentKind(kind);
  const publicHref = shareUrl || undefined;
  const showToolbar = Boolean(canEdit || publicHref);
  const toolbarButtonClassName = "!h-8 !text-sm !font-medium !leading-5";

  return (
    <div className={cn("space-y-3", fillHeight && "flex min-h-0 flex-1 flex-col")}>
      {showToolbar ? (
        <div className="flex shrink-0 items-center justify-between gap-2">
          {publicHref ? (
            <Button asChild className={toolbarButtonClassName} size="sm" variant="outline">
              <a href={publicHref} rel="noopener noreferrer" target="_blank">
                <ExternalLinkIcon aria-hidden="true" />
                View public file
              </a>
            </Button>
          ) : (
            <span />
          )}
          {canEdit ? (
            <Button
              className={toolbarButtonClassName}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setEditing((current) => !current)}
            >
              {editing ? <CheckIcon aria-hidden="true" /> : <PencilIcon aria-hidden="true" />}
              {editing ? "Done" : "Edit"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {canEdit && editing ? (
        <DocumentSourceEditor
          content={content}
          fileHref={fileHref}
          fillHeight={fillHeight}
          kind={kind}
          title={title}
          onChange={onChange}
        />
      ) : (
        <DocumentViewer
          content={content}
          fileHref={fileHref}
          fillHeight={fillHeight}
          kind={kind}
          title={title}
        />
      )}
    </div>
  );
}

function DocumentSourceEditor({
  content,
  fileHref,
  fillHeight,
  kind,
  onChange,
  title,
}: {
  readonly content: string;
  readonly fileHref: string;
  readonly fillHeight?: boolean;
  readonly kind: DocumentKind;
  readonly onChange: (content: string) => void;
  readonly title: string;
}) {
  if (kind === "markdown") {
    return (
      <MarkdownSourceEditor
        fillHeight={fillHeight}
        minHeightClassName="min-h-80"
        placeholder="Start writing…"
        value={content}
        onChange={onChange}
      />
    );
  }

  if (kind === "csv") {
    return <CsvEditor className={fillHeight ? "min-h-0 flex-1" : undefined} value={content} onChange={onChange} />;
  }

  if (kind === "html" || kind === "text" || kind === "json") {
    return (
      <Textarea
        aria-label={`${title} source`}
        autoComplete="off"
        className={cn("font-mono text-sm", fillHeight ? "min-h-0 flex-1 resize-none" : "min-h-80")}
        name="document-source"
        spellCheck={kind === "text"}
        value={content}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <DocumentViewer
      content={content}
      fileHref={fileHref}
      fillHeight={fillHeight}
      kind={kind}
      title={title}
    />
  );
}
