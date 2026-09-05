import type { FileUIPart } from "ai";

export type PendingPrompt = {
  text: string;
  files: FileUIPart[];
};

const keyFor = (chatId: string) => `pending:${chatId}`;

// Survives React Strict Mode remounts, which reset component state after the
// first take() would otherwise have already removed sessionStorage.
const held = new Map<string, PendingPrompt>();
const sent = new Set<string>();

function parsePending(raw: string): PendingPrompt {
  try {
    const parsed = JSON.parse(raw) as PendingPrompt | string;
    if (typeof parsed === "string") {
      return { files: [], text: parsed };
    }
    return {
      files: parsed.files ?? [],
      text: parsed.text ?? "",
    };
  } catch {
    return { files: [], text: raw };
  }
}

export function storePendingPrompt(chatId: string, pending: PendingPrompt) {
  sent.delete(chatId);
  held.set(chatId, pending);
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(keyFor(chatId), JSON.stringify(pending));
}

export function takePendingPrompt(chatId: string): PendingPrompt | undefined {
  if (sent.has(chatId)) return;
  const cached = held.get(chatId);
  if (cached) return cached;
  if (typeof sessionStorage === "undefined") return;

  const raw = sessionStorage.getItem(keyFor(chatId));
  if (!raw) return;
  const pending = parsePending(raw);
  held.set(chatId, pending);
  return pending;
}

export function claimPendingPrompt(chatId: string): boolean {
  if (sent.has(chatId)) return false;
  sent.add(chatId);
  held.delete(chatId);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(keyFor(chatId));
  }
  return true;
}
