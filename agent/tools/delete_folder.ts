import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireUser } from "../lib/identity";
import { deleteUserFolder } from "../../lib/document-folders";

export default defineTool({
  description:
    "Delete a folder from the file library. Files and nested folders inside it move to the parent folder.",
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  async execute(input, ctx) {
    const user = requireUser(ctx);
    await deleteUserFolder(user.userId, input.id);
    return { ok: true, id: input.id };
  },
});
