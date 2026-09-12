import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { ensureStoredEmailContent, toClientEmail } from "../../lib/email-inbox";
import { getEmail } from "../../lib/store";

export default defineTool({
  description: "Read one stored inbox email by id, including the full HTML and plain-text body.",
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    const email = await getEmail(user.userId, input.id);
    if (!email) {
      throw new Error("Email not found.");
    }
    return toClientEmail(await ensureStoredEmailContent(email));
  },
});
