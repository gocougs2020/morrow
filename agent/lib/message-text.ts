import type { ModelMessage } from "ai";

export function textFromModelMessage(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content.trim();
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n")
    .trim();
}

export function lastMessageText(
  messages: readonly ModelMessage[],
  role: ModelMessage["role"],
): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== role) continue;
    const text = textFromModelMessage(message);
    if (text) return text;
  }
  return "";
}
