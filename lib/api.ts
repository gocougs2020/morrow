import { NextResponse } from "next/server";
import { getAuth, sessionIfAllowed } from "@/lib/auth";
import { ensureNeonAuthSchema } from "@/lib/db";

export async function requireApiSession(request: Request) {
  await ensureNeonAuthSchema();
  const session = await sessionIfAllowed(
    await getAuth().api.getSession({ headers: request.headers }),
    request.headers,
  );
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}
