import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { getUserSettings, upsertUserSettings } from "@/lib/store";
import type { ModelTier } from "@/lib/types";

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  return NextResponse.json({
    settings: await getUserSettings(session.user.id),
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
    modelTier: body.modelTier,
    instructionOverlay: body.instructionOverlay,
  });
  return NextResponse.json({ settings });
}
