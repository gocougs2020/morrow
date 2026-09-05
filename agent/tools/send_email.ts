import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { requireUser, resolveSendTo } from "../lib/identity";
import { sendUserEmail } from "../../lib/email-send";
import { resendConfigured } from "../../lib/resend";

export default defineTool({
  description:
    "Send an email through Resend. Use after the user asks to send, including weekly reports, files, or replies. Requires approval. Attach library files with documentIds. Omit to (or pass me / my email) to send to the signed-in user's account email — do not ask them to type that address.",
  approval: always(),
  inputSchema: z.object({
    to: z
      .string()
      .optional()
      .describe(
        "Recipient email, or comma-separated addresses. Omit to send to the signed-in user's account email.",
      ),
    subject: z.string().min(1),
    body: z.string().min(1).describe("Plain-text body."),
    cc: z.string().optional().describe("Optional CC addresses, comma-separated."),
    html: z.string().optional().describe("Optional HTML body. Defaults to the text body."),
    documentIds: z
      .array(z.string())
      .optional()
      .describe("Library file ids to attach (reports, PDFs, CSVs)."),
    replyToEmailId: z.string().optional().describe("Resend or inbox id to thread as a reply."),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    const to = await resolveSendTo(user, input.to);
    if (!to) {
      return {
        sent: false,
        message: "The signed-in user has no email on file, so a recipient address is required.",
        draft: input,
      };
    }
    if (!resendConfigured()) {
      return {
        sent: false,
        message:
          "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL, then try again.",
        draft: { ...input, to },
      };
    }

    const email = await sendUserEmail({
      userId: user.userId,
      to,
      cc: input.cc ? [input.cc] : undefined,
      subject: input.subject,
      body: input.body,
      html: input.html,
      documentIds: input.documentIds,
      inReplyTo: input.replyToEmailId,
      idempotencyKey: `send-email/${ctx.callId}`,
    });

    return {
      sent: true,
      emailId: email.id,
      resendEmailId: email.resendEmailId,
      to: email.toAddresses,
      subject: email.subject,
      href: `/inbox/${email.id}`,
    };
  },
});
