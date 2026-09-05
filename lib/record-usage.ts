import { randomUUID } from "node:crypto";
import type { MessageStreamEvent } from "eve/client";
import { estimateUsageCost, EXA_SEARCH_MODEL_ID } from "@/lib/model-prices";
import {
  collectStepUsageFromEvents,
  collectWebSearchFromEvents,
  costForStep,
  tokensFromUnknownUsage,
} from "@/lib/usage";
import { getUsageScope } from "@/lib/usage-scope";
import { listChatEvents, upsertUsageRecord } from "@/lib/store";
import type { UsagePurpose, UsageRecord } from "@/lib/types";

export async function recordModelUsage(input: {
  readonly chatId?: string | null;
  readonly costUsd?: number;
  readonly id?: string;
  readonly modelId: string;
  readonly purpose: UsagePurpose;
  readonly userId?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly reasoningTokens?: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
}): Promise<void> {
  const scope = getUsageScope();
  const userId = input.userId ?? scope?.userId;
  if (!userId) return;
  const tokens = {
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    reasoningTokens: input.reasoningTokens ?? 0,
    cacheReadTokens: input.cacheReadTokens ?? 0,
    cacheWriteTokens: input.cacheWriteTokens ?? 0,
  };
  const costUsd =
    typeof input.costUsd === "number" && Number.isFinite(input.costUsd)
      ? Math.max(0, input.costUsd)
      : estimateUsageCost(input.modelId, tokens);
  const record: UsageRecord = {
    id: input.id ?? randomUUID(),
    userId,
    chatId: input.chatId ?? scope?.chatId ?? null,
    purpose: input.purpose,
    modelId: input.modelId,
    ...tokens,
    costUsd,
    createdAt: new Date().toISOString(),
  };
  await upsertUsageRecord(record);
}

export async function recordGenerateTextUsage(
  purpose: UsagePurpose,
  modelId: string,
  result: { readonly totalUsage?: unknown; readonly usage?: unknown },
  attribution?: { readonly chatId?: string | null; readonly id?: string; readonly userId?: string },
): Promise<void> {
  try {
    await recordModelUsage({
      ...tokensFromUnknownUsage(result.totalUsage ?? result.usage),
      chatId: attribution?.chatId,
      id: attribution?.id,
      modelId,
      purpose,
      userId: attribution?.userId,
    });
  } catch (error) {
    console.error("[usage] generateText record failed", { modelId, purpose, error });
  }
}

export async function recordEmbeddingUsage(
  modelId: string,
  usage: unknown,
  attribution?: { readonly chatId?: string | null; readonly userId?: string },
): Promise<void> {
  try {
    await recordModelUsage({
      ...tokensFromUnknownUsage(usage),
      chatId: attribution?.chatId,
      modelId,
      purpose: "embeddings",
      userId: attribution?.userId,
    });
  } catch (error) {
    console.error("[usage] embedding record failed", { modelId, error });
  }
}

function isStreamEvent(value: unknown): value is MessageStreamEvent {
  return Boolean(value && typeof value === "object" && "type" in value && typeof value.type === "string");
}

export async function syncChatUsageFromEvents(userId: string, chatId: string): Promise<void> {
  try {
    const rows = await listChatEvents(chatId);
    const events = rows.map((row) => row.event).filter(isStreamEvent);
    const { steps } = collectStepUsageFromEvents(events);
    const searches = collectWebSearchFromEvents(events);
    await Promise.all([
      ...steps.map((step) =>
        recordModelUsage({
          ...step,
          chatId,
          costUsd: costForStep(step),
          id: `${chatId}:step:${step.turnId}:${step.stepIndex}`,
          modelId: step.modelId,
          purpose: step.purpose,
          userId,
        }),
      ),
      ...searches.map((search) =>
        recordModelUsage({
          chatId,
          costUsd: search.costUsd,
          id: `${chatId}:search:${search.turnId}:${search.callId}`,
          modelId: EXA_SEARCH_MODEL_ID,
          purpose: "web_search",
          userId,
        }),
      ),
    ]);
  } catch (error) {
    console.error("[usage] chat event sync failed", { chatId, error });
  }
}
