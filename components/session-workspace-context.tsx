"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import { useLinkStatus } from "next/link";
import type { ChatRecord } from "@/lib/types";

export type CancelSession = (chatId: string) => Promise<void>;

export type SessionWorkspaceValue = {
  readonly activeChatId?: string;
  readonly chats: ChatRecord[];
  readonly deleteChat: (chat: ChatRecord) => Promise<void>;
  readonly openNewSession: () => void;
  readonly openSession: (chatId: string) => void;
  readonly registerCancel: (cancel: CancelSession) => () => void;
  readonly setActiveChatId: (chatId?: string) => void;
  readonly setChats: Dispatch<SetStateAction<ChatRecord[]>>;
};

export const SessionWorkspaceContext = createContext<SessionWorkspaceValue | null>(null);

export function useOptionalSessionWorkspace() {
  return useContext(SessionWorkspaceContext);
}

export function useWorkspaceLinkPending() {
  const { pending } = useLinkStatus();
  return pending;
}
