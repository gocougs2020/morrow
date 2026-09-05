"use client";

import { useEffect, useRef } from "react";
import { CsvEditor } from "@/components/csv-editor";
import { defaultStreamdownProps } from "@/lib/streamdown";
import type { DocumentKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

export function DocumentViewer({
  className,
  content,
  fileHref,
  fillHeight,
  kind,
  title,
}: {
  readonly className?: string;
  readonly content?: string;
  readonly fileHref: string;
  readonly fillHeight?: boolean;
  readonly kind: DocumentKind;
  readonly title: string;
}) {
  const frame = cn(fillHeight && "min-h-0 flex-1 overflow-auto");

  if (kind === "image") {
    return (
      <div className={cn("rounded-xl border bg-card", frame, className)}>
        <img
          alt={title}
          className={cn("w-full object-contain", fillHeight && "max-h-full")}
          height={1024}
          src={fileHref}
          width={1024}
        />
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        className={cn("w-full rounded-xl border bg-card", fillHeight ? frame : "min-h-[40rem]", className)}
        src={fileHref}
        title={title}
      />
    );
  }

  if (kind === "html") {
    return (
      <HtmlDocumentFrame
        className={className}
        content={content ?? ""}
        fillHeight={fillHeight}
        title={title}
      />
    );
  }

  if (kind === "markdown") {
    return (
      <Streamdown
        {...defaultStreamdownProps}
        className={cn(
          "markdown-document rounded-xl border bg-card px-4 py-3",
          frame,
          className,
        )}
        mode="static"
      >
        {content ?? ""}
      </Streamdown>
    );
  }

  if (kind === "csv") {
    return (
      <CsvEditor
        className={frame}
        disabled
        onChange={() => undefined}
        value={content ?? ""}
      />
    );
  }

  if (kind === "json" || kind === "text") {
    return (
      <pre className={cn("rounded-xl border bg-card p-4 text-sm", frame, className)}>
        {content ?? ""}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground text-sm",
        frame,
        className,
      )}
    >
      <p>Preview is not available for this file type.</p>
      <a className="mt-3 inline-block text-foreground underline" href={`${fileHref}?download=1`}>
        Download file
      </a>
    </div>
  );
}

function HtmlDocumentFrame({
  className,
  content,
  fillHeight,
  title,
}: {
  readonly className?: string;
  readonly content: string;
  readonly fillHeight?: boolean;
  readonly title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (fillHeight) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const fit = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const height = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
      iframe.style.height = `${height}px`;
    };

    const bind = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(doc.documentElement);
      if (doc.body) observer.observe(doc.body);
      const images = [...doc.querySelectorAll("img")];
      for (const image of images) {
        if (!image.complete) image.addEventListener("load", fit);
      }
      return () => {
        observer.disconnect();
        for (const image of images) {
          image.removeEventListener("load", fit);
        }
      };
    };

    let unbind = bind();
    const onLoad = () => {
      unbind?.();
      unbind = bind();
    };
    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      unbind?.();
    };
  }, [content, fillHeight]);

  return (
    <iframe
      ref={iframeRef}
      className={cn(
        "w-full rounded-xl border bg-background",
        fillHeight ? "min-h-0 flex-1 overflow-auto" : "overflow-hidden",
        className,
      )}
      sandbox={fillHeight ? "" : "allow-same-origin"}
      srcDoc={content}
      title={title}
    />
  );
}
