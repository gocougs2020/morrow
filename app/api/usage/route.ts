import { NextResponse } from "next/server";
import { canViewAccountUsage } from "@/lib/access";
import { requireApiSession } from "@/lib/api";
import { listAppUsers } from "@/lib/email-users";
import { extrasTotals, summarizeUsageRecords, toUsagePageSnapshot } from "@/lib/usage";
import {
  getChat,
  listAccountChats,
  listAccountUsage,
  listChatUsage,
  listChats,
  listUserUsage,
} from "@/lib/store";

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;

  const url = new URL(request.url);
  const chatId = url.searchParams.get("chatId")?.trim();
  if (chatId) {
    if (!(await getChat(session.user.id, chatId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const records = await listChatUsage(session.user.id, chatId);
    const summary = summarizeUsageRecords(records);
    return NextResponse.json({
      extras: extrasTotals(records),
      totals: summary.totals,
      byPurpose: summary.byPurpose,
    });
  }

  if (url.searchParams.get("scope") === "account") {
    if (!canViewAccountUsage(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [records, chats, users] = await Promise.all([
      listAccountUsage(),
      listAccountChats(),
      listAppUsers(),
    ]);
    return NextResponse.json(
      toUsagePageSnapshot(records, chats, { users, includeSessions: false }),
    );
  }

  const [records, chats] = await Promise.all([
    listUserUsage(session.user.id),
    listChats(session.user.id),
  ]);
  return NextResponse.json(toUsagePageSnapshot(records, chats, { includeSessions: true }));
}
