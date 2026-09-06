import { normalizeChatSource, type ChatRecord } from "@/lib/types";

export const INCLUDE_SCHEDULED_SESSIONS_KEY = "session-list-include-scheduled";

export function isScheduledChat(chat: Pick<ChatRecord, "source">): boolean {
  return normalizeChatSource(chat.source) === "schedule";
}

export function filterSessionList<T extends Pick<ChatRecord, "id" | "source">>(
  chats: readonly T[],
  options: { includeScheduled: boolean; alwaysIncludeId?: string },
): T[] {
  if (options.includeScheduled) return [...chats];
  return chats.filter((chat) => !isScheduledChat(chat) || chat.id === options.alwaysIncludeId);
}

export function readIncludeScheduledSessions(): boolean {
  try {
    return window.localStorage.getItem(INCLUDE_SCHEDULED_SESSIONS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeIncludeScheduledSessions(value: boolean) {
  try {
    window.localStorage.setItem(INCLUDE_SCHEDULED_SESSIONS_KEY, value ? "1" : "0");
  } catch {
    // Ignore quota / private-mode failures; the in-memory toggle still works.
  }
}
