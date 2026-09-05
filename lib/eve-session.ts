import { Client } from "eve/client";

export function eveClientFromRequest(request: Request): Client {
  const origin = requestOrigin(request);
  return new Client({
    host: origin,
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  });
}

export async function teardownEveSession(request: Request, sessionId: string): Promise<void> {
  const session = eveClientFromRequest(request).sessions.attach(sessionId);
  try {
    await session.cancel();
  } catch {
    // No active turn, or the session is already gone.
  }
  try {
    await session.reset({ reason: "User deleted session" });
  } catch {
    // Already retired or unknown is a successful teardown.
  }
}

function requestOrigin(request: Request): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return new URL(request.url).origin;
}
