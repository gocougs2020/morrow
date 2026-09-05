import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { ensureNeonAuthSchema } from "@/lib/db";

async function handle(request: Request, method: "GET" | "POST") {
  await ensureNeonAuthSchema();
  return toNextJsHandler(getAuth())[method](request);
}

export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
