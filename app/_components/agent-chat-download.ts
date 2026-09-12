import type { FileUIPart, UIMessage } from "ai";
import type { EveMessage } from "eve/react";

export function transcriptDownloadMessages(messages: readonly EveMessage[]): UIMessage[] {
  return messages.flatMap((message) => {
    const parts = message.parts.flatMap((part) =>
      part.type === "text" && part.text ? [{ text: part.text, type: "text" as const }] : [],
    );
    return parts.length > 0 ? [{ id: message.id, parts, role: message.role }] : [];
  });
}

export function conversationFilename(title: string, chatId: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || `jarvis-${chatId}`}.md`;
}

export async function persistChatFiles(chatId: string, files: FileUIPart[]) {
  for (const file of files) {
    if (!file.url) continue;
    try {
      const blob = await fetch(file.url).then((response) => response.blob());
      const body = new FormData();
      body.append("file", blob, file.filename ?? "upload");
      body.append("title", file.filename?.replace(/\.[^.]+$/, "") || "Upload");
      body.append("filename", file.filename ?? "upload");
      body.append("mimeType", file.mediaType);
      body.append("chatId", chatId);
      await fetch("/api/documents", { method: "POST", body });
    } catch {
      // Uploading into the library is best-effort and must not block the turn.
    }
  }
}
