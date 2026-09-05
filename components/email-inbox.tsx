"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRightIcon, InboxIcon, MailIcon, SearchIcon, SendIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailDirection, EmailRecord } from "@/lib/types";
import { cn, formatSessionUpdatedAt } from "@/lib/utils";

export type ClientEmail = EmailRecord & {
  href: string;
  sessionHref: string | null;
  match?: "subject" | "body" | "similar";
};

const FILTERS: { id: "all" | EmailDirection; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inbound", label: "Inbox" },
  { id: "outbound", label: "Sent" },
];

export function EmailInbox({ emails: initialEmails }: { readonly emails: ClientEmail[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EmailDirection>("all");
  const [results, setResults] = useState<ClientEmail[]>();
  const [searching, setSearching] = useState(false);
  const timer = useRef<number>(undefined);
  const seq = useRef(0);

  const trimmedQuery = query.trim();
  const inSearch = Boolean(trimmedQuery);
  const showSearching = inSearch && (searching || results === undefined);

  useEffect(() => {
    const trimmed = query.trim();
    window.clearTimeout(timer.current);
    if (!trimmed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- search status while fetching
    setSearching(true);
    const next = ++seq.current;
    timer.current = window.setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed });
      if (filter !== "all") params.set("direction", filter);
      void fetch(`/api/inbox?${params}`)
        .then(async (response) => {
          if (!response.ok) return { emails: [] as ClientEmail[] };
          return (await response.json()) as { emails: ClientEmail[] };
        })
        .then((payload) => {
          if (seq.current === next) setResults(payload.emails ?? []);
        })
        .catch(() => {
          if (seq.current === next) setResults([]);
        })
        .finally(() => {
          if (seq.current === next) setSearching(false);
        });
    }, 200);
    return () => window.clearTimeout(timer.current);
  }, [filter, query]);

  const visible = useMemo(() => {
    if (query.trim()) return results ?? [];
    if (filter === "all") return initialEmails;
    return initialEmails.filter((email) => email.direction === filter);
  }, [filter, initialEmails, query, results]);

  const empty = !query.trim() && initialEmails.length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-8 pb-20" id="main" tabIndex={-1}>
        <div className="flex flex-col gap-1">
          <h1 className="text-pretty font-medium text-lg tracking-tight">Inbox</h1>
          <p className="text-muted-foreground text-sm">
            Mail the agent sends and receives. Search subjects and bodies.
          </p>
        </div>

        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search email"
            className="bg-white pl-9 dark:bg-input/30"
            placeholder="Search by subject, person, or what the email was about…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              type="button"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {query.trim() ? (
          <p className="text-muted-foreground text-sm">
            {showSearching ? "Searching…" : `${visible.length} matching emails`}
          </p>
        ) : null}

        {empty ? (
          <div className="rounded-xl border bg-white/30 px-4 py-16 text-center text-muted-foreground text-sm dark:bg-black/30">
            No mail yet. Ask the agent to send a report or document, or email the inbound Resend address.
          </div>
        ) : showSearching ? null : visible.length === 0 ? (
          <div className="rounded-xl border bg-white/30 px-4 py-16 text-center text-muted-foreground text-sm dark:bg-black/30">
            {query.trim() ? "No emails match that search." : "No emails in this folder."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white/30 dark:bg-black/30">
            {visible.map((email, index) => (
              <EmailRow
                email={email}
                key={email.id}
                showDivider={index > 0}
                onOpen={() => router.push(email.href)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmailRow({
  email,
  showDivider,
  onOpen,
}: {
  readonly email: ClientEmail;
  readonly showDivider: boolean;
  readonly onOpen: () => void;
}) {
  const inbound = email.direction === "inbound";
  const counterpart = inbound ? email.fromAddress : email.toAddresses.join(", ");
  return (
    <div>
      {showDivider ? <div className="h-px bg-border" /> : null}
      <Link
        className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
        href={email.href}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onOpen();
        }}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            inbound ? "bg-primary/10 text-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {inbound ? <InboxIcon className="size-4" /> : <SendIcon className="size-4" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-medium text-sm">{email.subject || "(no subject)"}</p>
            <span className="shrink-0 text-muted-foreground text-xs" suppressHydrationWarning>
              {formatSessionUpdatedAt(email.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <Badge variant="secondary">{inbound ? "Received" : "Sent"}</Badge>
            {email.hasActionItem ? <Badge>Action</Badge> : null}
            {email.match ? <Badge variant="outline">{email.match}</Badge> : null}
            <span className="truncate">{counterpart}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function EmailDetail({ email }: { readonly email: ClientEmail }) {
  const inbound = email.direction === "inbound";
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      <AppHeader backHref="/inbox" backLabel="Inbox" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-8 pb-20" id="main" tabIndex={-1}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{inbound ? "Received" : "Sent"}</Badge>
            {email.hasActionItem ? <Badge>Action</Badge> : null}
            {email.status === "failed" ? <Badge variant="destructive">Failed</Badge> : null}
          </div>
          <h1 className="text-pretty font-medium text-2xl tracking-tight">
            {email.subject || "(no subject)"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {inbound ? "From" : "To"} {inbound ? email.fromAddress : email.toAddresses.join(", ")}
            <span aria-hidden> · </span>
            <span suppressHydrationWarning>{formatSessionUpdatedAt(email.createdAt)}</span>
          </p>
        </div>

        {email.actionSummary ? (
          <div className="rounded-xl border bg-white/30 px-4 py-3 text-sm dark:bg-black/30">
            <p className="font-medium">Action item</p>
            <p className="mt-1 text-muted-foreground">{email.actionSummary}</p>
          </div>
        ) : null}

        {email.sessionHref ? (
          <Button asChild className="w-fit" size="sm">
            <Link href={email.sessionHref}>
              Open session
              <ArrowUpRightIcon />
            </Link>
          </Button>
        ) : null}

        <article className="overflow-hidden rounded-xl border bg-white/30 dark:bg-black/30">
          <dl className="grid gap-2 border-b px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">From</dt>
              <dd>{email.fromAddress}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">To</dt>
              <dd>{email.toAddresses.join(", ") || "—"}</dd>
            </div>
            {email.ccAddresses.length > 0 ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Cc</dt>
                <dd>{email.ccAddresses.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
          <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-sm leading-6">
            {email.bodyText || stripHtml(email.bodyHtml) || "(empty)"}
          </pre>
        </article>

        {email.attachments.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="font-medium text-sm">Attachments</p>
            <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
              {email.attachments.map((attachment) => (
                <li className="flex items-center gap-2" key={`${attachment.filename}-${attachment.contentType}`}>
                  <MailIcon className="size-4" />
                  {attachment.filename}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
