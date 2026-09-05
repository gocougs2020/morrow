import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { authFormErrorMessage, formField } from "@/lib/auth-form";
import { ensureNeonAuthSchema } from "@/lib/db";
import { clientKey, RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!rateLimit(clientKey(request, "signup"), { limit: 5, windowMs: 15 * 60 * 1000 })) {
    const dest = new URL("/sign-up", request.url);
    dest.searchParams.set("error", RATE_LIMIT_MESSAGE);
    return NextResponse.redirect(dest, 303);
  }

  const formData = await request.formData();
  const name = formField(formData, "name");
  const email = formField(formData, "email");
  const password = formField(formData, "password", { trim: false });

  await ensureNeonAuthSchema();
  try {
    await getAuth().api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    const dest = new URL("/sign-up", request.url);
    dest.searchParams.set("error", authFormErrorMessage(error));
    return NextResponse.redirect(dest, 303);
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
