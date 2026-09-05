import type { SessionCitation, SessionCitationSet } from "@/lib/types";

type TextPartMessage = {
  id: string;
  role: string;
  parts: readonly { type: string; text?: string }[];
};

export function userMessageText(message: TextPartMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n")
    .trim();
}

export function catalogForAssistantMessage(
  message: TextPartMessage,
  messages: readonly TextPartMessage[],
  sets: readonly SessionCitationSet[],
): SessionCitation[] {
  if (message.role !== "assistant") return [];
  const position = messages.findIndex((row) => row.id === message.id);
  const prior = [...messages.slice(0, position >= 0 ? position : messages.length)]
    .reverse()
    .find((row) => row.role === "user");
  if (!prior) return [];
  const query = userMessageText(prior);
  return sets.find((set) => set.queryText === query)?.citations ?? [];
}

export const RELATED_CHATS_PREVIEW_COUNT = 3;

export type RelatedChatRow = {
  citation: SessionCitation;
  mark: number;
};

export function linkifySessionCitations(
  text: string,
  citations: readonly SessionCitation[],
): string {
  if (!text || citations.length === 0) return text;
  const displayByOriginal = displayIndexByOriginal(text, citations);
  const byIndex = new Map(citations.map((citation) => [citation.index, citation]));
  return text
    .replace(/\s*\[(\d+)\](?!\()/g, (match, raw: string) => {
      const citation = byIndex.get(Number(raw));
      const display = citation ? displayByOriginal.get(citation.index) : undefined;
      return citation && display ? `[${display}](${citation.href})` : match;
    })
    .replace(/\s*\[(\d+)\]\((\/s\/[^)]+)\)/g, (_match, raw: string, href: string) => {
      const path = href.split(/[?#]/)[0];
      const citation =
        citations.find((item) => item.href === path) ?? byIndex.get(Number(raw));
      const display = citation ? displayByOriginal.get(citation.index) : undefined;
      return display ? `[${display}](${href})` : `[${raw}](${href})`;
    });
}

export function displaySessionCitationText(
  text: string,
  catalog: readonly SessionCitation[],
): string {
  return linkifySessionCitations(text, catalog).replace(
    /\[(\d+)\]\(\/s\/[^)]+\)/g,
    "[$1]",
  );
}

export function citationsUsedInText(
  text: string,
  catalog: readonly SessionCitation[],
): SessionCitation[] {
  if (catalog.length === 0) return [];
  const byIndex = new Map(catalog.map((citation) => [citation.index, citation]));
  const byHref = new Map(catalog.map((citation) => [citation.href, citation]));
  const used: SessionCitation[] = [];
  const seen = new Set<string>();

  const add = (citation: SessionCitation | undefined) => {
    if (!citation || seen.has(citation.chatId)) return;
    seen.add(citation.chatId);
    used.push(citation);
  };

  for (const match of text.matchAll(/\[(\d+)\](?:\((\/s\/[^)]+)\))?/g)) {
    const href = match[2]?.split(/[?#]/)[0];
    if (href) add(byHref.get(href) ?? byIndex.get(Number(match[1])));
    else add(byIndex.get(Number(match[1])));
  }
  for (const match of text.matchAll(/\]\((\/s\/[^)\s?#]+)/g)) {
    add(byHref.get(match[1]));
  }
  return used;
}

export function relatedChatsForFooter(
  text: string,
  catalog: readonly SessionCitation[],
): RelatedChatRow[] {
  return citationsUsedInText(text, catalog).map((citation, index) => ({
    citation: { ...citation, index: index + 1 },
    mark: index + 1,
  }));
}

function displayIndexByOriginal(
  text: string,
  catalog: readonly SessionCitation[],
): Map<number, number> {
  return new Map(
    citationsUsedInText(text, catalog).map((citation, index) => [citation.index, index + 1]),
  );
}

export function parseSessionFromStack(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function relatedSessionHref(
  targetChatId: string,
  currentChatId: string,
  fromStack: readonly string[],
): string {
  const path = `/s/${targetChatId}`;
  if (targetChatId === currentChatId) {
    return fromStack.length > 0 ? `${path}?from=${fromStack.join(",")}` : path;
  }
  const existing = fromStack.indexOf(targetChatId);
  if (existing !== -1) {
    const prior = fromStack.slice(0, existing);
    return prior.length > 0 ? `${path}?from=${prior.join(",")}` : path;
  }
  const trail = [...fromStack.filter((id) => id !== currentChatId), currentChatId];
  return `${path}?from=${trail.join(",")}`;
}

export function previousSessionId(fromStack: readonly string[]): string | undefined {
  return fromStack[fromStack.length - 1];
}

export function previousSessionHref(fromStack: readonly string[]): string | undefined {
  const previousId = previousSessionId(fromStack);
  if (!previousId) return undefined;
  const remaining = fromStack.slice(0, -1);
  return remaining.length > 0
    ? `/s/${previousId}?from=${remaining.join(",")}`
    : `/s/${previousId}`;
}

export function isSessionCitationHref(href: string | undefined): href is string {
  return Boolean(href?.startsWith("/s/"));
}
