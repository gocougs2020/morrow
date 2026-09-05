import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { listJobs } from "../../lib/store";

export default defineTool({
  description: "List scheduled jobs this user created.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await listJobs(requireUser(ctx).userId);
  },
});
