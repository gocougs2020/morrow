"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentChat } from "@/app/_components/agent-chat";
import { SessionSourceMeta } from "@/components/session-source-meta";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { filterSessionList } from "@/lib/session-list";
import type { ChatRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const recentPreviewCount = 3;
const recentPanelClass = "rounded-xl border bg-white/30 dark:bg-black/30";

export function LandingHome() {
  const [chats, setChats] = useState<ChatRecord[]>();

  useEffect(() => {
    void fetch("/api/chats")
      .then(async (response) => {
        if (!response.ok) return { chats: [] as ChatRecord[] };
        return (await response.json()) as { chats: ChatRecord[] };
      })
      .then((payload) => setChats(payload.chats ?? []))
      .catch(() => setChats([]));
  }, []);

  return (
    <AgentChat chats={chats ?? []} compose="landing">
      <RecentSessions chats={chats} />
    </AgentChat>
  );
}

function RecentSessions({ chats }: { chats: ChatRecord[] | undefined }) {
  const conversationChats = chats ? filterSessionList(chats, { includeScheduled: false }) : [];
  const visibleChats = conversationChats.slice(0, recentPreviewCount);

  return (
    <section className="flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Recent
        </h2>
        <Link
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/s"
        >
          View All
        </Link>
      </div>
      {chats === undefined ? (
        <div className={`overflow-hidden ${recentPanelClass}`}>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      ) : conversationChats.length === 0 ? (
        <div className={`${recentPanelClass} px-4 py-10 text-center text-muted-foreground text-sm`}>
          {chats.length === 0
            ? "No sessions yet. Start with a skill above."
            : "No recent conversations. Scheduled runs are in Sessions."}
        </div>
      ) : (
        <div className={`overflow-hidden ${recentPanelClass}`}>
          {visibleChats.map((chat, index) => (
            <div key={chat.id}>
              {index > 0 ? <Separator /> : null}
              <Link
                className="flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-accent/40"
                href={`/s/${chat.id}`}
              >
                <p className="truncate font-normal text-sm">{chat.title}</p>
                {chat.description ? (
                  <p className="line-clamp-2 text-muted-foreground text-xs">{chat.description}</p>
                ) : null}
                <SessionSourceMeta
                  chat={chat}
                  time={<span>{formatRelativeTime(chat.updatedAt)}</span>}
                  variant="badge"
                />
              </Link>
            </div>
          ))}
          <Separator />
          <Link
            className="flex items-center justify-center bg-foreground/[0.08] px-4 py-2.5 font-medium text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.12] hover:text-foreground"
            href="/s"
          >
            View all
          </Link>
        </div>
      )}
    </section>
  );
}
