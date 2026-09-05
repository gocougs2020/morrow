import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { syncChatUsageFromEvents } from "@/lib/record-usage";
import { getChat, replaceChatEvents, upsertChatEvent } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  if (!(await getChat(session.user.id, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    index?: number;
    event?: unknown;
    events?: unknown[];
  };
  try {
    if (Array.isArray(body.events)) {
      await replaceChatEvents(id, body.events);
    } else if (typeof body.index === "number") {
      await upsertChatEvent(id, body.index, body.event);
    }
    void syncChatUsageFromEvents(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[chat-events] persist failed", {
      chatId: id,
      count: Array.isArray(body.events) ? body.events.length : 1,
      error,
    });
    return NextResponse.json({ error: "Failed to persist events" }, { status: 500 });
  }
}
