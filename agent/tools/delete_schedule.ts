import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { deleteJob } from "../../lib/store";

export default defineTool({
  description: "Permanently delete one of this user's scheduled jobs.",
  approval: always(),
  inputSchema: z.object({
    id: z.string(),
  }),
  async execute({ id }, ctx) {
    return { deleted: await deleteJob(requireUser(ctx).userId, id) };
  },
});
