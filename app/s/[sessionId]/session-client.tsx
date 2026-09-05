"use client";

import { useEffect, useState } from "react";
import type { MessageStreamEvent } from "eve/client";
import { AgentChat } from "@/app/_components/agent-chat";
import { takePendingPrompt, type PendingPrompt } from "@/lib/pending-prompt";
import type { ChatRecord } from "@/lib/types";

export function SessionClient({
  chat,
  from,
  initialCanvasOpen = false,
  initialDocumentId,
  initialEvents,
}: {
  readonly chat: ChatRecord;
  readonly from?: string;
  readonly initialCanvasOpen?: boolean;
  readonly initialDocumentId?: string;
  readonly initialEvents: MessageStreamEvent[];
}) {
  const [pending, setPending] = useState<PendingPrompt>();

  useEffect(() => {
    const next = takePendingPrompt(chat.id);
    // Side-effecting consume of a one-shot pending prompt.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consume pending prompt
    if (next) setPending(next);
  }, [chat.id]);

  return (
    <AgentChat
      chat={chat}
      from={from}
      initialCanvasOpen={initialCanvasOpen}
      initialDocumentId={initialDocumentId}
      initialEvents={initialEvents}
      initialFiles={pending?.files}
      initialPrompt={pending?.text}
    />
  );
}
