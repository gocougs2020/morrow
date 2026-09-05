import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchWeb } from "../../lib/web-search";

export default defineTool({
  description:
    "Search the web for current information. Returns titles, URLs, and excerpts.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Natural-language web search query."),
    type: z
      .string()
      .optional()
      .describe("Search mode: auto (default), fast, or instant."),
    num_results: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Maximum number of results to return. Defaults to 10."),
    category: z
      .string()
      .optional()
      .describe(
        "Optional focus: company, people, research paper, news, personal site, or financial report.",
      ),
    include_domains: z.array(z.string()).optional(),
    exclude_domains: z.array(z.string()).optional(),
  }),
  async execute(input, ctx) {
    return searchWeb({
      abortSignal: ctx.abortSignal,
      category: input.category,
      excludeDomains: input.exclude_domains,
      includeDomains: input.include_domains,
      numResults: input.num_results,
      query: input.query,
      type: input.type,
    });
  },
});
