import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import { parseJobCadence, scheduleFieldsFromCadence } from "@/lib/job-cadence";
import { createJob, deleteJob, listJobs, updateJob } from "@/lib/store";
import { isOwnedBy, isResourceVisibility } from "@/lib/visibility";

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  return NextResponse.json({ jobs: await listJobs(session.user.id) });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as {
    prompt: string;
    firstRunAt?: string;
    everyMinutes?: number | null;
    cadence?: unknown;
    visibility?: string;
  };
  const cadence = body.cadence !== undefined ? parseJobCadence(body.cadence) : null;
  if (body.cadence !== undefined && !cadence) {
    return NextResponse.json({ error: "That schedule timing is not valid." }, { status: 400 });
  }
  const fields = cadence ? scheduleFieldsFromCadence(cadence) : null;
  const firstRunAt = body.firstRunAt ?? fields?.nextRunAt;
  if (!body.prompt?.trim() || !firstRunAt) {
    return NextResponse.json({ error: "A prompt and first run time are required." }, { status: 400 });
  }
  return NextResponse.json({
    job: await createJob(session.user.id, {
      prompt: body.prompt,
      firstRunAt,
      everyMinutes: fields?.everyMinutes ?? body.everyMinutes ?? null,
      cadence: fields?.cadence ?? null,
      authenticator: "better-auth",
      issuer: null,
      visibility: isResourceVisibility(body.visibility) ? body.visibility : undefined,
    }),
  });
}

export async function PATCH(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as {
    id: string;
    prompt?: string;
    nextRunAt?: string;
    everyMinutes?: number | null;
    cadence?: unknown;
    enabled?: boolean;
    visibility?: string;
  };
  const current = (await listJobs(session.user.id)).find((job) => job.id === body.id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwnedBy(current, session.user.id)) {
    return NextResponse.json({ error: "You can only change schedules you created." }, { status: 403 });
  }
  const cadence = body.cadence !== undefined ? parseJobCadence(body.cadence) : undefined;
  if (body.cadence !== undefined && !cadence) {
    return NextResponse.json({ error: "That schedule timing is not valid." }, { status: 400 });
  }
  const fields = cadence ? scheduleFieldsFromCadence(cadence) : null;
  const job = await updateJob(
    session.user.id,
    body.id,
    compactPatch({
      prompt: body.prompt,
      enabled: body.enabled,
      visibility: isResourceVisibility(body.visibility) ? body.visibility : undefined,
      ...(fields
        ? fields
        : {
            nextRunAt: body.nextRunAt,
            everyMinutes: body.everyMinutes,
          }),
    }),
  );
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = (await request.json()) as { id: string };
  const current = (await listJobs(session.user.id)).find((job) => job.id === id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwnedBy(current, session.user.id)) {
    return NextResponse.json({ error: "You can only delete schedules you created." }, { status: 403 });
  }
  const deleted = await deleteJob(session.user.id, id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function compactPatch<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
