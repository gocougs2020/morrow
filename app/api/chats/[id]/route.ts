import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { teardownEveSession } from "@/lib/eve-session";
import { deleteChat, getChat, listChatEvents, updateChat } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const chat = await getChat(session.user.id, id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    chat,
    events: (await listChatEvents(id)).map((row) => row.event),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    sessionId?: string | null;
    streamIndex?: number;
    touchUpdatedAt?: boolean;
  };
  const chat = await updateChat(session.user.id, id, body);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ chat });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const chat = await getChat(session.user.id, id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.sessionId) {
    await teardownEveSession(request, chat.sessionId);
  }
  await deleteChat(session.user.id, id);
  return NextResponse.json({ ok: true });
}
