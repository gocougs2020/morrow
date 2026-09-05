"use client";

import type { ComponentProps, ReactNode } from "react";
import { useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { StreamdownContext } from "streamdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RELATED_CHATS_PREVIEW_COUNT,
  isSessionCitationHref,
  relatedSessionHref,
  type RelatedChatRow,
} from "@/lib/session-citations";
import type { SessionCitation } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SessionCitationNav = {
  readonly currentChatId: string;
  readonly fromStack: readonly string[];
};

export function SessionCitationMark({
  citation,
  children,
  className,
  nav,
}: {
  readonly citation: SessionCitation;
  readonly children: ReactNode;
  readonly className?: string;
  readonly nav: SessionCitationNav;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            aria-label={`Related chat: ${citation.title}`}
            className={cn(
              "inline-flex size-4 mb-1 shrink-0 items-center justify-center rounded-[4px] bg-gray-400 align-text-bottom font-medium text-[0.625rem] text-white no-underline tabular-nums leading-none hover:bg-gray-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
              className,
            )}
            href={relatedSessionHref(citation.chatId, nav.currentChatId, nav.fromStack)}
            prefetch={false}
          >
            {children}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{citation.title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SessionCitationFooter({
  items,
  nav,
}: {
  readonly items: readonly RelatedChatRow[];
  readonly nav: SessionCitationNav;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, RELATED_CHATS_PREVIEW_COUNT);
  const canExpand = items.length > RELATED_CHATS_PREVIEW_COUNT;

  return (
    <div className="mt-3 space-y-1.5 text-muted-foreground text-xs">
      <p className="font-medium text-muted-foreground">Related Chats</p>
      <ul className="space-y-1">
        {visible.map((item) => (
          <li className="flex min-w-0 items-center gap-2" key={item.citation.chatId}>
            <SessionCitationMark className="mb-0" citation={item.citation} nav={nav}>
              {item.mark}
            </SessionCitationMark>
            <Link
              className="min-w-0 truncate text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              href={relatedSessionHref(item.citation.chatId, nav.currentChatId, nav.fromStack)}
              prefetch={false}
              title={item.citation.description || item.citation.title}
            >
              {item.citation.title}
            </Link>
          </li>
        ))}
      </ul>
      {canExpand ? (
        <button
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground"
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}

export function sessionCitationComponents(
  citations: readonly SessionCitation[],
  nav: SessionCitationNav,
) {
  const byHref = new Map(citations.map((citation) => [citation.href, citation]));

  return {
    a: ({
      href,
      children,
      className,
      ...props
    }: ComponentProps<"a">) => {
      const path = href?.split(/[?#]/)[0];
      const citation = path ? byHref.get(path) : undefined;
      if (citation && isIndexLabel(children)) {
        return (
          <SessionCitationMark citation={citation} nav={nav}>
            {children}
          </SessionCitationMark>
        );
      }
      if (isSessionCitationHref(path)) {
        const chatId = path.slice("/s/".length);
        return (
          <Link
            className={cn(
              "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
              className,
            )}
            href={relatedSessionHref(chatId, nav.currentChatId, nav.fromStack)}
            prefetch={false}
          >
            {children}
          </Link>
        );
      }
      return (
        <ExternalMarkdownLink className={className} href={href} {...props}>
          {children}
        </ExternalMarkdownLink>
      );
    },
  };
}

function ExternalMarkdownLink({
  href,
  children,
  className,
  ...props
}: ComponentProps<"a">) {
  const { linkSafety } = useContext(StreamdownContext);
  const [open, setOpen] = useState(false);
  const incomplete = href === "streamdown:incomplete-link";
  const close = useCallback(() => setOpen(false), []);
  const confirm = useCallback(() => {
    if (href) window.open(href, "_blank", "noreferrer");
    setOpen(false);
  }, [href]);

  if (!linkSafety?.enabled || !href || incomplete) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }

  return (
    <>
      <button
        className={cn("wrap-anywhere appearance-none text-left font-medium text-primary underline", className)}
        data-streamdown="link"
        type="button"
        onClick={async (event) => {
          event.preventDefault();
          if (linkSafety.onLinkCheck && (await linkSafety.onLinkCheck(href))) {
            window.open(href, "_blank", "noreferrer");
            return;
          }
          setOpen(true);
        }}
      >
        {children}
      </button>
      {linkSafety.renderModal ? (
        linkSafety.renderModal({ isOpen: open, onClose: close, onConfirm: confirm, url: href })
      ) : (
        <DefaultLinkSafetyModal isOpen={open} url={href} onClose={close} onConfirm={confirm} />
      )}
    </>
  );
}

function DefaultLinkSafetyModal({
  isOpen,
  onClose,
  onConfirm,
  url,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly url: string;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"
        role="dialog"
        aria-label="Open external link"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-semibold text-lg">Open external link?</p>
        <p className="break-all rounded-md bg-muted p-3 font-mono text-sm">{url}</p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-md border bg-background px-4 py-2 font-medium text-sm hover:bg-muted"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            type="button"
            onClick={onConfirm}
          >
            Open
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function isIndexLabel(children: ReactNode): boolean {
  if (typeof children === "string" || typeof children === "number") {
    return /^\d+$/.test(String(children));
  }
  if (Array.isArray(children) && children.length === 1) {
    return isIndexLabel(children[0]);
  }
  return false;
}
