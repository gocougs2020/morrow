import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { composeInboundMailAddress, inboundMailboxAddress } from "@/lib/inbound-mail-token";
import { rotateInboundMailToken } from "@/lib/store";

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const settings = await rotateInboundMailToken(session.user.id);
  const mailbox = inboundMailboxAddress();
  return NextResponse.json({
    inboundMail: {
      address: settings.inboundMailToken
        ? composeInboundMailAddress(settings.inboundMailToken, mailbox)
        : null,
      configured: Boolean(mailbox),
    },
  });
}