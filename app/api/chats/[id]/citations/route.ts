import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { getChat, listSessionCitationSets } from "@/lib/store";

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
    citations: await listSessionCitationSets(session.user.id, id),
  });
}
