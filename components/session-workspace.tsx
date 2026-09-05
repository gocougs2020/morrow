"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MessageStreamEvent } from "eve/client";
import { AgentChat } from "@/app/_components/agent-chat";
import { AppHeader } from "@/components/app-header";
import { SessionSidebar } from "@/components/session-sidebar";
import {
  SessionWorkspaceContext,
  type CancelSession,
  useOptionalSessionWorkspace,
  useWorkspaceLinkPending,
} from "@/components/session-workspace-context";
import { pushClientUrl, replaceClientUrl, sessionPath } from "@/lib/start-web-session";
import type { ChatRecord } from "@/lib/types";

export { useOptionalSessionWorkspace, useWorkspaceLinkPending };

type OpenedSession = {
  readonly chat: ChatRecord;
  readonly events: MessageStreamEvent[];
};

type UrlSync = {
  readonly syncUrl?: boolean;
};

export function SessionWorkspace({
  chats: initialChats,
  children,
}: {
  readonly chats: ChatRecord[];
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatIdState] = useState<string>();
  const [opened, setOpened] = useState<OpenedSession>();
  const [loadingId, setLoadingId] = useState<string>();
  const [clientOwned, setClientOwned] = useState(false);
  const cancelRef = useRef<CancelSession>(async () => undefined);
  const loadGeneration = useRef(0);
  const didMountPath = useRef(false);
  const activeChatIdRef = useRef<string | undefined>(undefined);
  const openedIdRef = useRef<string | undefined>(undefined);
  const loadingIdRef = useRef<string | undefined>(undefined);
  const pathChatId = chatIdFromPath(pathname);
  const highlightId = activeChatId ?? pathChatId;

  // eslint-disable-next-line react-hooks/refs -- latest active id for async open
  activeChatIdRef.current = activeChatId;
  // eslint-disable-next-line react-hooks/refs -- latest opened id for stale-response checks
  openedIdRef.current = opened?.chat.id;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge server chat list into client extras
    setChats((current) => mergeChatLists(current, initialChats));
  }, [initialChats]);

  const setActiveChatId = useCallback((chatId?: string) => {
    activeChatIdRef.current = chatId;
    setActiveChatIdState(chatId);
  }, []);

  const resetToNewSession = useCallback((options?: UrlSync) => {
    loadGeneration.current += 1;
    activeChatIdRef.current = undefined;
    loadingIdRef.current = undefined;
    setClientOwned(true);
    setActiveChatIdState(undefined);
    setOpened(undefined);
    setLoadingId(undefined);
    if (options?.syncUrl !== false) {
      pushClientUrl("/s");
    }
  }, []);

  const openSession = useCallback((chatId: string, options?: UrlSync) => {
    activeChatIdRef.current = chatId;
    setClientOwned(true);
    setActiveChatIdState(chatId);
    if (options?.syncUrl !== false) {
      pushClientUrl(sessionPath(chatId));
    }
    if (openedIdRef.current === chatId) {
      setLoadingId(undefined);
      return;
    }
    if (loadingIdRef.current === chatId) return;
    loadingIdRef.current = chatId;
    setLoadingId(chatId);
    const generation = ++loadGeneration.current;
    void fetch(`/api/chats/${chatId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to open this session.");
        return (await response.json()) as { chat?: ChatRecord; events?: MessageStreamEvent[] };
      })
      .then((payload) => {
        if (generation !== loadGeneration.current || !payload.chat) return;
        loadingIdRef.current = undefined;
        setLoadingId(undefined);
        setOpened({ chat: payload.chat, events: payload.events ?? [] });
      })
      .catch(() => {
        if (generation !== loadGeneration.current) return;
        loadingIdRef.current = undefined;
        setLoadingId(undefined);
        const fallback = openedIdRef.current;
        activeChatIdRef.current = fallback;
        setActiveChatIdState(fallback);
      });
  }, []);

  const syncFromPath = useCallback(
    (nextPathname: string) => {
      const pathId = chatIdFromPath(nextPathname);
      if (pathId === activeChatIdRef.current) return;
      if (!pathId) {
        resetToNewSession({ syncUrl: false });
        return;
      }
      openSession(pathId, { syncUrl: false });
    },
    [openSession, resetToNewSession],
  );

  useEffect(() => {
    if (!didMountPath.current) {
      didMountPath.current = true;
      return;
    }
    if (pathname !== window.location.pathname) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync workspace to the URL
    syncFromPath(pathname);
  }, [pathname, syncFromPath]);

  useEffect(() => {
    const onPopState = () => {
      syncFromPath(window.location.pathname);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncFromPath]);

  const registerCancel = useCallback((cancel: CancelSession) => {
    cancelRef.current = cancel;
    return () => {
      if (cancelRef.current === cancel) {
        cancelRef.current = async () => undefined;
      }
    };
  }, []);

  const deleteChat = useCallback(
    async (target: ChatRecord) => {
      await cancelRef.current(target.id);
      const response = await fetch(`/api/chats/${target.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete this session.");
      }
      setChats((current) => current.filter((row) => row.id !== target.id));
      if (target.id === (activeChatIdRef.current ?? pathChatId)) {
        resetToNewSession({ syncUrl: false });
        replaceClientUrl("/s");
      }
    },
    [pathChatId, resetToNewSession],
  );

  const value = useMemo(
    () => ({
      activeChatId: highlightId,
      chats,
      deleteChat,
      openNewSession: resetToNewSession,
      openSession,
      registerCancel,
      setActiveChatId,
      setChats,
    }),
    [chats, deleteChat, highlightId, openSession, registerCancel, resetToNewSession, setActiveChatId],
  );

  const switching =
    Boolean(clientOwned && loadingId && loadingId === activeChatId && opened?.chat.id !== loadingId);
  let pane: ReactNode = children;
  if (clientOwned) {
    pane = (
      <AgentChat
        chat={opened?.chat}
        compose="sidebar"
        contentLoading={switching}
        initialEvents={opened?.events ?? []}
      />
    );
  }

  return (
    <SessionWorkspaceContext.Provider value={value}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background pb-[env(safe-area-inset-bottom)] text-foreground">
        <AppHeader hideOnMobile />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="hidden h-full min-h-0 md:flex md:flex-col">
            <SessionSidebar
              activeChatId={highlightId}
              chats={chats}
              onDeleteChat={deleteChat}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{pane}</div>
        </div>
      </div>
    </SessionWorkspaceContext.Provider>
  );
}

function chatIdFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith("/s/")) return undefined;
  const id = pathname.slice(3);
  return id.length > 0 ? id : undefined;
}

function mergeChatLists(current: ChatRecord[], incoming: ChatRecord[]): ChatRecord[] {
  const incomingIds = new Set(incoming.map((chat) => chat.id));
  const extras = current.filter((chat) => !incomingIds.has(chat.id));
  if (extras.length === 0) return incoming;
  return [...extras, ...incoming].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
