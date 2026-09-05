import { connection } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, MissingAuthSecretError, sessionIfAllowed } from "@/lib/auth";
import { ensureNeonAuthSchema } from "@/lib/db";

export async function getSession() {
  await connection();
  await ensureNeonAuthSchema();
  try {
    const requestHeaders = await headers();
    const session = await getAuth().api.getSession({
      headers: requestHeaders,
    });
    return sessionIfAllowed(session, requestHeaders);
  } catch (error) {
    if (error instanceof MissingAuthSecretError) return null;
    console.error("Failed to read session", error);
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}
