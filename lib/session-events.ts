import type { LanguageModelUsage } from "ai";
import { isCurrentTurnBoundaryEvent, type MessageStreamEvent } from "eve/client";
import { collectStepUsageFromEvents, languageModelUsageFromTokens, totalsFromSteps } from "@/lib/usage";
import { turnContextWindowTokens } from "./token-budget";

export type SessionContextUsage = {
  readonly compactionCount: number;
  readonly lastCompactionInputTokens: number | null;
  readonly maxTokens: number;
  readonly modelId: string;
  readonly sessionCostUsd: number;
  readonly stepCount: number;
  readonly usage: LanguageModelUsage;
  readonly usedTokens: number;
};

export function sessionContextUsage(
  events: readonly MessageStreamEvent[],
): SessionContextUsage | undefined {
  const collected = collectStepUsageFromEvents(events);
  const lastStep = collected.lastStep;
  const modelId = collected.lastChatModelId ?? lastStep?.modelId;
  if (!modelId || !lastStep) return undefined;

  const sessionTotals = totalsFromSteps(collected.steps);

  return {
    compactionCount: collected.compactionCount,
    lastCompactionInputTokens: collected.lastCompactionInputTokens,
    maxTokens: turnContextWindowTokens(modelId),
    modelId,
    sessionCostUsd: sessionTotals.costUsd,
    stepCount: collected.steps.length,
    usedTokens: lastStep.inputTokens,
    usage: languageModelUsageFromTokens(sessionTotals),
  };
}

export function hasSettledSessionTail(events: readonly MessageStreamEvent[]): boolean {
  const last = events.at(-1);
  return last !== undefined && isCurrentTurnBoundaryEvent(last);
}

export function shouldResumeEveSession(
  sessionId: string | null | undefined,
  events: readonly MessageStreamEvent[] = [],
): boolean {
  return Boolean(sessionId) && !hasSettledSessionTail(events);
}

export function hasTerminalSessionTail(events: readonly MessageStreamEvent[]): boolean {
  const last = events.at(-1);
  return last?.type === "session.failed" || last?.type === "session.completed";
}

export function isInactiveSessionError(message: string): boolean {
  return /no longer active|no_active_session|unknown or terminal/i.test(message);
}
