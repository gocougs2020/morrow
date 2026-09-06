import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import {
  composeInboundMailAddress,
  inboundMailboxAddress,
} from "@/lib/inbound-mail-token";
import { ensureInboundMailToken, upsertUserSettings } from "@/lib/store";
import type { ModelTier } from "@/lib/types";

function inboundMailPayload(token: string | null) {
  const mailbox = inboundMailboxAddress();
  return {
    address: token ? composeInboundMailAddress(token, mailbox) : null,
    configured: Boolean(mailbox),
  };
}

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const settings = await ensureInboundMailToken(session.user.id);
  return NextResponse.json({
    settings: {
      userId: settings.userId,
      modelTier: settings.modelTier,
      instructionOverlay: settings.instructionOverlay,
    },
    inboundMail: inboundMailPayload(settings.inboundMailToken),
  });
}

export async function PATCH(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as {
    modelTier?: ModelTier;
    instructionOverlay?: string;
  };
  const settings = await upsertUserSettings(session.user.id, {
    ...(body.modelTier !== undefined ? { modelTier: body.modelTier } : {}),
    ...(body.instructionOverlay !== undefined
      ? { instructionOverlay: body.instructionOverlay }
      : {}),
  });
  return NextResponse.json({
    settings: {
      userId: settings.userId,
      modelTier: settings.modelTier,
      instructionOverlay: settings.instructionOverlay,
    },
    inboundMail: inboundMailPayload(settings.inboundMailToken),
  });
}
