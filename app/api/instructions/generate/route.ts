import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { generateInstructionMarkdown, type InstructionKind } from "@/lib/generate-instructions";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { runWithUsageScope } from "@/lib/usage-scope";

function isInstructionKind(value: unknown): value is InstructionKind {
  return value === "overlay" || value === "skill";
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  if (!rateLimit(`instr:${session.user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    current?: unknown;
    kind?: unknown;
    prompt?: unknown;
    skillDescription?: unknown;
    skillName?: unknown;
    skillSlug?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (!isInstructionKind(body.kind)) {
    return NextResponse.json({ error: "Invalid instruction kind." }, { status: 400 });
  }
  const kind = body.kind;

  try {
    const generated = await runWithUsageScope({ userId: session.user.id }, () =>
      generateInstructionMarkdown({
        current: typeof body.current === "string" ? body.current : "",
        kind,
        prompt,
        skillDescription: typeof body.skillDescription === "string" ? body.skillDescription : undefined,
        skillName: typeof body.skillName === "string" ? body.skillName : undefined,
        skillSlug: typeof body.skillSlug === "string" ? body.skillSlug : undefined,
      }),
    );
    if (!generated.markdown) {
      return NextResponse.json({ error: "The model returned empty instructions." }, { status: 502 });
    }
    return NextResponse.json(generated);
  } catch (generateError) {
    console.error("[instructions] generate failed", generateError);
    return NextResponse.json({ error: "Unable to generate instructions." }, { status: 502 });
  }
}
