import type { ReactNode } from "react";
import { ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isScheduledChat } from "@/lib/session-list";
import { chatSourceLabels, normalizeChatSource, type ChatRecord } from "@/lib/types";

export function SessionSourceMeta({
  chat,
  time,
  variant = "plain",
}: {
  readonly chat: Pick<ChatRecord, "source">;
  readonly time: ReactNode;
  readonly variant?: "plain" | "badge";
}) {
  const scheduled = isScheduledChat(chat);
  if (variant === "badge") {
    return (
      <span className="flex items-center gap-2 text-muted-foreground text-xs">
        {time}
        <span aria-hidden>·</span>
        <Badge className="gap-1" variant="secondary">
          {scheduled ? <ClockIcon aria-hidden="true" className="size-3" /> : null}
          {chatSourceLabels[normalizeChatSource(chat.source)]}
        </Badge>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      {time}
      {scheduled ? (
        <>
          <span aria-hidden>·</span>
          <ClockIcon aria-hidden="true" className="size-3 shrink-0" />
          <span>Schedule</span>
        </>
      ) : null}
    </span>
  );
}
