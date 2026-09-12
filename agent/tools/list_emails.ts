import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { searchUserInbox, toClientEmail } from "../../lib/email-inbox";
import { listEmails } from "../../lib/store";

export default defineTool({
  description:
    "List or search the user's email inbox (inbound and outbound). Use query to find messages by subject, body, or a description of the email. Results include a text preview; call read_email for the full HTML and text body.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Search by subject, body, people, or a natural-language description."),
    direction: z.enum(["inbound", "outbound"]).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    const limit = input.limit ?? 20;
    const query = input.query?.trim();
    if (query) {
      const results = await searchUserInbox(user.userId, query, {
        direction: input.direction,
        limit,
      });
      return results.map((hit) => ({
        ...toClientEmail(hit.email, { includeBodies: false, bodyPreviewChars: 4_000 }),
        match: hit.match,
        score: hit.score,
      }));
    }
    const emails = await listEmails(user.userId, { direction: input.direction, limit });
    return emails.map((email) => toClientEmail(email, { includeBodies: false, bodyPreviewChars: 4_000 }));
  },
});
