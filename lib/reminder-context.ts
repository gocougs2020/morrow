import { appConfig } from "@/app.config";
import { embedTexts } from "@/lib/embeddings";
import { parseSchedulePrompt } from "@/lib/schedule-prompt";
import {
  getChat,
  getChatByEveSessionId,
  getDocument,
  searchUserEmbeddings,
} from "@/lib/store";
import { runWithUsageScope } from "@/lib/usage-scope";
import type { EmbeddingKind, EmbeddingSearchHit } from "@/lib/types";

export const REMINDER_CONTEXT_SESSION_KINDS = [
  "session_title",
  "session_description",
  "session_prompt",
] as const satisfies readonly EmbeddingKind[];

export const REMINDER_CONTEXT_DOCUMENT_KINDS = [
  "document_title",
  "document_content",
] as const satisfies readonly EmbeddingKind[];

export const REMINDER_CONTEXT_KINDS = [
  ...REMINDER_CONTEXT_SESSION_KINDS,
  ...REMINDER_CONTEXT_DOCUMENT_KINDS,
] as const satisfies readonly EmbeddingKind[];

const TITLE_KINDS = new Set<EmbeddingKind>([
  "session_title",
  "session_description",
  "document_title",
]);

const FILLER = new Set([
  "a",
  "about",
  "afternoon",
  "am",
  "an",
  "and",
  "at",
  "do",
  "don't",
  "dont",
  "evening",
  "follow",
  "for",
  "forget",
  "friday",
  "in",
  "know",
  "let",
  "me",
  "monday",
  "morning",
  "my",
  "next",
  "night",
  "nudge",
  "of",
  "on",
  "our",
  "please",
  "pm",
  "remind",
  "reminder",
  "saturday",
  "sunday",
  "the",
  "this",
  "thursday",
  "to",
  "today",
  "tomorrow",
  "tonight",
  "tuesday",
  "up",
  "wednesday",
  "week",
  "weekend",
  "with",
  "yesterday",
  "your",
]);

export type ReminderContextHit = {
  href: string;
  kind: "session" | "file";
  score: number;
  snippet: string;
  title: string;
};

export function reminderSearchQuery(brief: string): string | null {
  const tokens = brief
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:']+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !FILLER.has(token))
    .filter((token) => !/^\d{1,2}(:\d{2})?(am|pm)?$/.test(token));
  const content = tokens.filter((token) => token.replace(/'/g, "").length >= 3);
  if (content.length === 0) return null;
  if (content.length === 1 && (content[0]?.length ?? 0) < 4) return null;
  return content.join(" ");
}

export function isTitleKind(kind: EmbeddingKind): boolean {
  return TITLE_KINDS.has(kind);
}

export function reminderContextPassesFloor(
  hit: Pick<EmbeddingSearchHit, "score"> & { record: { kind: EmbeddingKind } },
  minScore: number = appConfig.memory.reminderContextMinScore,
  bodyMinScore: number = appConfig.memory.reminderContextBodyMinScore,
): boolean {
  if (hit.score < minScore) return false;
  if (!isTitleKind(hit.record.kind) && hit.score < bodyMinScore) return false;
  return true;
}

export function pickReminderContextHits(
  hits: readonly EmbeddingSearchHit[],
  options?: { bodyMinScore?: number; minScore?: number },
): { document?: EmbeddingSearchHit; session?: EmbeddingSearchHit } {
  const minScore = options?.minScore ?? appConfig.memory.reminderContextMinScore;
  const bodyMinScore = options?.bodyMinScore ?? appConfig.memory.reminderContextBodyMinScore;
  const collapsed = collapseReminderHits(hits, minScore, bodyMinScore);
  let session: EmbeddingSearchHit | undefined;
  let document: EmbeddingSearchHit | undefined;
  for (const hit of collapsed) {
    if (!reminderContextPassesFloor(hit, minScore, bodyMinScore)) continue;
    if (hit.record.sourceType === "session" && !session) {
      session = hit;
      continue;
    }
    if (hit.record.sourceType === "document" && !document) {
      document = hit;
    }
    if (session && document) break;
  }
  return { session, document };
}

export function formatReminderContextLines(
  hits: readonly ReminderContextHit[],
  origin?: string,
): string {
  if (hits.length === 0) return "";
  const prefix = origin?.replace(/\/$/, "") ?? "";
  return hits
    .map((hit) => {
      const href = hit.href.startsWith("http") ? hit.href : `${prefix}${hit.href}`;
      const label = hit.kind === "session" ? "Session" : "File";
      return `${label}: ${hit.title} (${href})\n${hit.snippet}`;
    })
    .join("\n\n");
}

export async function recallReminderContext({
  brief,
  excludeChatId,
  userId,
}: {
  brief: string;
  excludeChatId?: string | null;
  origin?: string;
  userId: string;
}): Promise<ReminderContextHit[]> {
  const query = reminderSearchQuery(parseSchedulePrompt(brief).brief || brief);
  if (!query) return [];

  const [embedding] = await runWithUsageScope({ userId, chatId: excludeChatId }, () =>
    embedTexts([query]),
  );
  if (!embedding) return [];

  const matches = await searchUserEmbeddings({
    userId,
    queryEmbeddings: [embedding],
    kinds: REMINDER_CONTEXT_KINDS,
    excludeSourceIds: excludeChatId ? [excludeChatId] : [],
    limit: 16,
    minScore: appConfig.memory.reminderContextMinScore,
  });
  const picked = pickReminderContextHits(matches);
  const hits: ReminderContextHit[] = [];

  if (picked.session) {
    const chat =
      (await getChat(userId, picked.session.record.sourceId)) ??
      (await getChatByEveSessionId(userId, picked.session.record.sourceId));
    if (chat && chat.id !== excludeChatId) {
      hits.push({
        kind: "session",
        title: chat.title.trim() || "Session",
        href: `/s/${chat.id}`,
        snippet: clipSnippet(picked.session.record.text),
        score: picked.session.score,
      });
    }
  }

  if (picked.document) {
    const document = await getDocument(userId, picked.document.record.sourceId);
    if (document) {
      hits.push({
        kind: "file",
        title: document.title.trim() || document.filename,
        href: `/files/${document.id}`,
        snippet: clipSnippet(picked.document.record.text),
        score: picked.document.score,
      });
    }
  }

  return hits;
}

export async function reminderContextForDispatch(input: {
  brief: string;
  excludeChatId?: string | null;
  origin?: string;
  userId: string;
}): Promise<string | undefined> {
  try {
    const hits = await recallReminderContext(input);
    const lines = formatReminderContextLines(hits, input.origin);
    return lines || undefined;
  } catch (error) {
    console.error("[reminder-context] recall failed", error);
    return undefined;
  }
}

function collapseReminderHits(
  hits: readonly EmbeddingSearchHit[],
  minScore: number,
  bodyMinScore: number,
): EmbeddingSearchHit[] {
  const bySource = new Map<string, EmbeddingSearchHit>();
  for (const hit of hits) {
    const existing = bySource.get(hit.record.sourceId);
    if (!existing) {
      bySource.set(hit.record.sourceId, hit);
      continue;
    }
    bySource.set(hit.record.sourceId, preferReminderHit(existing, hit, minScore, bodyMinScore));
  }
  return [...bySource.values()].sort((left, right) => right.score - left.score);
}

function preferReminderHit(
  left: EmbeddingSearchHit,
  right: EmbeddingSearchHit,
  minScore: number,
  bodyMinScore: number,
): EmbeddingSearchHit {
  const leftTitle = isTitleKind(left.record.kind) && left.score >= minScore;
  const rightTitle = isTitleKind(right.record.kind) && right.score >= minScore;
  if (leftTitle !== rightTitle) return leftTitle ? left : right;
  const leftOk = reminderContextPassesFloor(left, minScore, bodyMinScore);
  const rightOk = reminderContextPassesFloor(right, minScore, bodyMinScore);
  if (leftOk !== rightOk) return leftOk ? left : right;
  return right.score > left.score ? right : left;
}

function clipSnippet(text: string, max = appConfig.memory.reminderContextSnippetChars): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
