"use client";

import { useEffect, useState } from "react";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { displayModelId } from "@/lib/model-prices";
import type { SessionContextUsage } from "@/lib/session-events";
import {
  addUsageTotals,
  emptyUsageTotals,
  formatTokenCount,
  formatUsd,
  type UsageTotals,
} from "@/lib/usage";

function UsageRow({
  label,
  tokens,
}: {
  readonly label: string;
  readonly tokens: number;
}) {
  if (!tokens) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatTokenCount(tokens)}</span>
    </div>
  );
}

export function SessionContextPopover({
  chatId,
  contextUsage,
  settled,
}: {
  readonly chatId?: string;
  readonly contextUsage: SessionContextUsage;
  readonly settled: boolean;
}) {
  const [extras, setExtras] = useState<UsageTotals>(emptyUsageTotals());

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    void fetch(`/api/usage?chatId=${encodeURIComponent(chatId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { extras?: UsageTotals } | null) => {
        if (cancelled || !payload?.extras) return;
        setExtras(payload.extras);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chatId, contextUsage.stepCount, settled]);

  const sessionCost = contextUsage.sessionCostUsd + extras.costUsd;
  const sessionTokens = addUsageTotals(
    {
      inputTokens: contextUsage.usage.inputTokens ?? 0,
      outputTokens: contextUsage.usage.outputTokens ?? 0,
      reasoningTokens: contextUsage.usage.outputTokenDetails?.reasoningTokens ?? 0,
      cacheReadTokens: contextUsage.usage.inputTokenDetails?.cacheReadTokens ?? 0,
      cacheWriteTokens: contextUsage.usage.inputTokenDetails?.cacheWriteTokens ?? 0,
      costUsd: contextUsage.sessionCostUsd,
      calls: contextUsage.stepCount,
    },
    extras,
  );
  const compactionLabel =
    contextUsage.compactionCount === 0
      ? "None yet"
      : contextUsage.compactionCount === 1
        ? contextUsage.lastCompactionInputTokens
          ? `Once · from ${formatTokenCount(contextUsage.lastCompactionInputTokens)}`
          : "Once"
        : contextUsage.lastCompactionInputTokens
          ? `${contextUsage.compactionCount} times · last from ${formatTokenCount(contextUsage.lastCompactionInputTokens)}`
          : `${contextUsage.compactionCount} times`;

  return (
    <Context
      maxTokens={contextUsage.maxTokens}
      modelId={contextUsage.modelId}
      usage={contextUsage.usage}
      usedTokens={contextUsage.usedTokens}
    >
      <ContextTrigger />
      <ContextContent>
        <div className="flex items-center justify-between gap-3 px-3 pt-3 text-xs">
          <span className="text-muted-foreground">Session model</span>
          <span className="truncate font-medium">{displayModelId(contextUsage.modelId)}</span>
        </div>
        <ContextContentHeader />
        <ContextContentBody className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current context</span>
            <span>{formatTokenCount(contextUsage.usedTokens)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Compaction</span>
            <span>{compactionLabel}</span>
          </div>
          <UsageRow label="Session input" tokens={sessionTokens.inputTokens} />
          <UsageRow label="Session output" tokens={sessionTokens.outputTokens} />
          <UsageRow label="Session cache" tokens={sessionTokens.cacheReadTokens} />
          <UsageRow label="Session reasoning" tokens={sessionTokens.reasoningTokens} />
        </ContextContentBody>
        <ContextContentFooter>
          <span className="text-muted-foreground">Session cost</span>
          <span>{formatUsd(sessionCost)}</span>
        </ContextContentFooter>
      </ContextContent>
    </Context>
  );
}
