import { Client } from "eve/client";
import type { ChatRecord } from "@/lib/types";

const CREATE_SESSION_ERROR = "Unable to start this session. Check your connection and try again.";

let eveRuntimeWarm = false;

export function replaceClientUrl(href: string) {
  window.history.replaceState(window.history.state, "", href);
}

export function pushClientUrl(href: string) {
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === href) return;
  window.history.pushState(window.history.state, "", href);
}

export function sessionPath(chatId: string): string {
  return `/s/${chatId}`;
}

export function revealSessionPath(chatId: string) {
  replaceClientUrl(sessionPath(chatId));
}

export async function createWebChat(prompt: string): Promise<ChatRecord> {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt || "New session", source: "web" }),
  });
  if (!response.ok) {
    throw new Error(CREATE_SESSION_ERROR);
  }
  const payload = (await response.json()) as { chat?: ChatRecord };
  if (!payload.chat) {
    throw new Error(CREATE_SESSION_ERROR);
  }
  return payload.chat;
}

export function warmEveRuntime() {
  if (eveRuntimeWarm) return;
  eveRuntimeWarm = true;
  void new Client({ host: "" }).health().catch(() => undefined);
}
