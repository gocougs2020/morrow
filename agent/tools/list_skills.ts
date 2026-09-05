import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { listUserSkills } from "../../lib/store";

export default defineTool({
  description: "List this user's personal custom skills.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return await listUserSkills(requireUser(ctx).userId);
  },
});
