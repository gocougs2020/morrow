"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { ThemeAppearanceButton } from "@/components/theme-toggle";
import { useOptionalSessionWorkspace } from "@/components/session-workspace-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { appAccountNavItems, isAppNavActive } from "@/lib/app-nav";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/brand";
import type { ChatRecord } from "@/lib/types";
import { cn, formatSessionUpdatedAt } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 200;

export function SessionSidebar({
  chats: chatsProp,
  activeChatId,
  onDeleteChat,
}: {
  readonly chats?: ChatRecord[];
  readonly activeChatId?: string;
  readonly onDeleteChat?: (chat: ChatRecord) => Promise<void> | void;
}) {
  const workspace = useOptionalSessionWorkspace();
  const [fetchedChats, setFetchedChats] = useState<ChatRecord[]>();
  const [pendingDelete, setPendingDelete] = useState<ChatRecord>();
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatRecord[]>();
  const searchTimer = useRef<number>(undefined);
  const searchAbort = useRef<AbortController>(undefined);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (chatsProp !== undefined) return;
    let cancelled = false;
    void fetch("/api/chats")
      .then(async (response) => {
        if (!response.ok) return { chats: [] as ChatRecord[] };
        return (await response.json()) as { chats: ChatRecord[] };
      })
      .then((payload) => {
        if (!cancelled) setFetchedChats(payload.chats ?? []);
      })
      .catch(() => {
        if (!cancelled) setFetchedChats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [chatsProp]);

  const listRef = useRef<HTMLDivElement>(null);
  const accountNavRef = useRef<HTMLDivElement>(null);
  const [accountNavHeight, setAccountNavHeight] = useState(0);
  const [listGoesBehind, setListGoesBehind] = useState(false);
  const chats = chatsProp ?? fetchedChats ?? [];
  const searchingNow = Boolean(query.trim());
  const visibleChats = searchingNow ? (searchResults ?? []) : chats;
  const canDelete = Boolean(onDeleteChat) || chatsProp === undefined;

  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
    };
  }, []);

  const searchSessions = async (value: string) => {
    const trimmed = value.trim();
    const seq = ++searchSeq.current;
    searchAbort.current?.abort();
    if (!trimmed) {
      setSearchResults(undefined);
      return;
    }
    const controller = new AbortController();
    searchAbort.current = controller;
    try {
      const response = await fetch(`/api/chats?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (seq !== searchSeq.current) return;
      if (!response.ok) {
        setSearchResults([]);
        return;
      }
      const payload = (await response.json()) as { chats: ChatRecord[] };
      if (seq !== searchSeq.current) return;
      setSearchResults(payload.chats ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (seq !== searchSeq.current) return;
      setSearchResults([]);
    }
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!value.trim()) {
      searchAbort.current?.abort();
      searchSeq.current += 1;
      setSearchResults(undefined);
      return;
    }
    searchTimer.current = window.setTimeout(() => {
      void searchSessions(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const updateListOverlap = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      setListGoesBehind(false);
      return;
    }
    setListGoesBehind(list.scrollHeight - list.scrollTop - list.clientHeight > 1);
  }, []);

  useLayoutEffect(() => {
    const nav = accountNavRef.current;
    const list = listRef.current;
    if (!nav) return;

    const update = () => {
      setAccountNavHeight(nav.getBoundingClientRect().height);
      updateListOverlap();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    if (list) observer.observe(list);
    list?.addEventListener("scroll", updateListOverlap, { passive: true });
    return () => {
      observer.disconnect();
      list?.removeEventListener("scroll", updateListOverlap);
    };
  }, [visibleChats.length, updateListOverlap]);

  const confirmDelete = async () => {
    if (!pendingDelete || !canDelete) return;
    setDeleting(true);
    try {
      if (onDeleteChat) {
        await onDeleteChat(pendingDelete);
      } else {
        const response = await fetch(`/api/chats/${pendingDelete.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Unable to delete this session.");
        setFetchedChats((current) => current?.filter((row) => row.id !== pendingDelete.id));
      }
      setSearchResults((current) => current?.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <aside className="relative flex h-full min-h-0 w-72 flex-col overflow-hidden border-border bg-card max-md:pt-[env(safe-area-inset-top)] md:border-r">
      <div className="flex shrink-0 items-center px-3 py-3 pr-12 md:hidden">
        <Link className="truncate font-medium text-sm tracking-tight" href="/">
          {APP_NAME}
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between p-3">
          <p className="font-medium text-sm">Sessions</p>
          <Button asChild size="sm" variant="outline">
            <Link
              href="/s"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                  return;
                }
                if (!workspace) return;
                event.preventDefault();
                workspace.openNewSession();
              }}
            >
              <PlusIcon aria-hidden="true" />
              New
            </Link>
          </Button>
        </div>
        <div className="shrink-0 px-3 pb-2">
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search sessions"
              className="h-8 pl-8 text-sm"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search sessions…"
              value={query}
            />
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto max-md:pb-[var(--account-nav-height,0px)]"
          ref={listRef}
          style={
            accountNavHeight > 0
              ? ({ "--account-nav-height": `${accountNavHeight}px` } as CSSProperties)
              : undefined
          }
        >
          {/* Typical lists stay under 50 sessions; virtualize if that threshold is exceeded. */}
          <div className="space-y-1 p-2">
            {searchingNow && searchResults === undefined ? (
              <p className="px-2 py-6 text-muted-foreground text-sm">Searching…</p>
            ) : visibleChats.length === 0 ? (
              <p className="px-2 py-6 text-muted-foreground text-sm">
                {searchingNow ? "No sessions match that search." : "No recent sessions."}
              </p>
            ) : (
              visibleChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative rounded-md hover:bg-accent",
                    chat.id === activeChatId && "bg-accent",
                  )}
                >
                  <SessionChatLink chat={chat} showDeleteGutter={canDelete} />
                  {canDelete ? (
                    <Button
                      aria-label={`Delete ${chat.title}`}
                      className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPendingDelete(chat);
                      }}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <SidebarAccountNav listGoesBehind={listGoesBehind} ref={accountNavRef} />
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(undefined);
        }}
        open={pendingDelete !== undefined}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops any active turn, removes the conversation from your workspace, and
              retires the durable eve session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              variant="destructive"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function SidebarAccountNav({
  listGoesBehind,
  ref,
}: {
  readonly listGoesBehind: boolean;
  readonly ref: Ref<HTMLDivElement>;
}) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const email = session?.user.email;
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 bg-card pb-[env(safe-area-inset-bottom)] md:hidden",
        listGoesBehind && "shadow-[0_-12px_20px_-10px_color-mix(in_oklch,var(--foreground)_28%,transparent)]",
      )}
      ref={ref}
    >
      <Collapsible
        className="border-t border-border"
        onOpenChange={setOpen}
        open={open}
      >
        <CollapsibleContent className="max-h-[40dvh] overflow-y-auto px-1 pt-1">
          <nav className="flex flex-col">
            {appAccountNavItems.map((item) => {
              const active = isAppNavActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "rounded-md px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active ? "bg-accent text-foreground" : "text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                  prefetch={item.prefetch}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeAppearanceButton />
          <button
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-destructive text-sm outline-none hover:bg-destructive/10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.assign("/sign-in");
                  },
                },
              });
            }}
            type="button"
          >
            Sign out
          </button>
        </CollapsibleContent>
        <CollapsibleTrigger asChild>
          <Button
            aria-expanded={open}
            className="h-auto w-full justify-between px-3 py-2.5 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <span className="truncate">{email ?? "Account"}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}

function SessionChatLink({
  chat,
  showDeleteGutter,
}: {
  readonly chat: ChatRecord;
  readonly showDeleteGutter: boolean;
}) {
  const router = useRouter();
  const workspace = useOptionalSessionWorkspace();
  const href = `/s/${chat.id}`;

  return (
    <Link
      className="block px-3 py-2 text-sm"
      href={href}
      prefetch={false}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        if (!workspace) return;
        event.preventDefault();
        workspace.openSession(chat.id);
      }}
      onPointerEnter={() => {
        router.prefetch(href);
      }}
    >
      <span className="block">
        <span className="line-clamp-2">{chat.title}</span>
        {chat.description ? (
          <span className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
            {chat.description}
          </span>
        ) : null}
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <SessionUpdatedAt value={chat.updatedAt} />
          {showDeleteGutter ? <span aria-hidden className="size-6 shrink-0" /> : null}
        </span>
      </span>
    </Link>
  );
}

function SessionUpdatedAt({ value }: { readonly value: string }) {
  const [now, setNow] = useState<Date>();

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [value]);

  return (
    <span className="min-w-0 truncate text-muted-foreground text-xs" suppressHydrationWarning>
      {now ? formatSessionUpdatedAt(value, now) : ""}
    </span>
  );
}
