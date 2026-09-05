import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import {
  addProfileMemory,
  deleteProfileMemory,
  listProfileMemories,
  ProfileMemoryError,
  updateProfileMemory,
} from "@/lib/profile-memory";

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  try {
    return NextResponse.json({ memories: await listProfileMemories(session.user.id) });
  } catch (memoryError) {
    return memoryErrorResponse(memoryError);
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as { text?: string };
  try {
    const memory = await addProfileMemory(session.user.id, body.text ?? "");
    return NextResponse.json({
      memory,
      memories: await listProfileMemories(session.user.id),
    });
  } catch (memoryError) {
    return memoryErrorResponse(memoryError);
  }
}

export async function PATCH(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as { index?: number; text?: string };
  const index = parseMemoryIndex(body.index);
  if (index === null) {
    return NextResponse.json({ error: "A memory index is required." }, { status: 400 });
  }
  try {
    const memory = await updateProfileMemory(session.user.id, index, body.text ?? "");
    return NextResponse.json({
      memory,
      memories: await listProfileMemories(session.user.id),
    });
  } catch (memoryError) {
    return memoryErrorResponse(memoryError);
  }
}

export async function DELETE(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as { index?: number };
  const index = parseMemoryIndex(body.index);
  if (index === null) {
    return NextResponse.json({ error: "A memory index is required." }, { status: 400 });
  }
  try {
    await deleteProfileMemory(session.user.id, index);
    return NextResponse.json({
      ok: true,
      memories: await listProfileMemories(session.user.id),
    });
  } catch (memoryError) {
    return memoryErrorResponse(memoryError);
  }
}

function parseMemoryIndex(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function memoryErrorResponse(error: unknown) {
  if (error instanceof ProfileMemoryError) {
    const notFound = error.message === "Memory not found.";
    return NextResponse.json({ error: error.message }, { status: notFound ? 404 : 400 });
  }
  console.error("[memories]", error);
  return NextResponse.json({ error: "Unable to update memories." }, { status: 500 });
}
