import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser, resolveSendTo } from "../lib/identity";

export default defineTool({
  description:
    "Draft an email. Does not send. Use send_email after the user approves. Omit to (or pass me / my email) to address the signed-in user — do not ask them to type that address.",
  inputSchema: z.object({
    to: z
      .string()
      .optional()
      .describe("Recipient email. Omit to use the signed-in user's account email."),
    subject: z.string().min(1),
    body: z.string().min(1),
    purpose: z.string().optional(),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    const to = await resolveSendTo(user, input.to);
    return {
      status: "draft",
      ...input,
      to: to ?? input.to,
      nextStep: "Ask the user to review, then call send_email if they want it sent.",
    };
  },
});
