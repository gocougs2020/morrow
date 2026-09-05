import { after, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { refreshSessionSummary } from "@/lib/session-memory";
import { getChat } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const chat = await getChat(session.user.id, id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ description: chat.description, title: chat.title });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const chat = await getChat(session.user.id, id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    messages?: unknown;
    prompt?: unknown;
  };
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((value): value is string => typeof value === "string")
    : [];
  const prompt = typeof body.prompt === "string" ? body.prompt : undefined;
  const userId = session.user.id;

  after(async () => {
    try {
      await refreshSessionSummary({
        chat,
        messages,
        prompt,
        userId,
      });
    } catch (error) {
      console.error("[session-title] background generate failed", { chatId: id, error });
    }
  });

  return NextResponse.json({ ok: true, pending: true });
}
