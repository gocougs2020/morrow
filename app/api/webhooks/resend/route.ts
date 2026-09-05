import { NextResponse } from "next/server";
import { processInboundResendEmail } from "@/lib/email-inbox";
import { getResend, resendConfigured } from "@/lib/resend";

export const runtime = "nodejs";

function headerValue(request: Request, name: string): string {
  return request.headers.get(name) ?? request.headers.get(name.toLowerCase()) ?? "";
}

export async function POST(request: Request) {
  if (!resendConfigured() || !process.env.RESEND_WEBHOOK_SECRET) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const payload = await request.text();
  try {
    const event = getResend().webhooks.verify({
      payload,
      headers: {
        id: headerValue(request, "svix-id"),
        timestamp: headerValue(request, "svix-timestamp"),
        signature: headerValue(request, "svix-signature"),
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });

    if (event.type === "email.received") {
      await processInboundResendEmail({
        emailId: event.data.email_id,
        from: event.data.from,
        to: event.data.to,
        cc: event.data.cc,
        receivedFor: event.data.received_for,
        subject: event.data.subject,
        attachments: event.data.attachments,
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[email] webhook failed", error);
    return new NextResponse("Error", { status: 400 });
  }
}
