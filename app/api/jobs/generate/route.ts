import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { generateScheduleUpdate } from "@/lib/generate-schedule";
import { parseJobCadence } from "@/lib/job-cadence";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import {
  cadenceFiresMoreThanOncePerDay,
  resolveHostSchedulePlan,
  SUB_DAILY_SCHEDULE_MESSAGE,
} from "@/lib/vercel-plan";
import { runWithUsageScope } from "@/lib/usage-scope";

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  if (!rateLimit(`jobgen:${session.user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    currentCadence?: unknown;
    currentPrompt?: unknown;
    prompt?: unknown;
    timezone?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  const currentCadence = parseJobCadence(body.currentCadence);
  if (!currentCadence) {
    return NextResponse.json({ error: "A current schedule cadence is required." }, { status: 400 });
  }

  try {
    const schedulePlan = await resolveHostSchedulePlan();
    const generated = await runWithUsageScope({ userId: session.user.id }, () =>
      generateScheduleUpdate({
        allowsSubDaily: schedulePlan.allowsSubDaily,
        currentCadence,
        currentPrompt: typeof body.currentPrompt === "string" ? body.currentPrompt : "",
        prompt,
        timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      }),
    );
    if (
      !schedulePlan.allowsSubDaily &&
      cadenceFiresMoreThanOncePerDay(generated.cadence)
    ) {
      return NextResponse.json({ error: SUB_DAILY_SCHEDULE_MESSAGE }, { status: 400 });
    }
    return NextResponse.json(generated);
  } catch (generateError) {
    console.error("[jobs] generate failed", generateError);
    return NextResponse.json({ error: "Unable to update this schedule." }, { status: 502 });
  }
}
