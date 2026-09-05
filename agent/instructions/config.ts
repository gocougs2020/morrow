import { defineDynamic, defineInstructions } from "eve/instructions";
import { disabledBuiltinSkillSlugs } from "../../lib/app-config";

export default defineDynamic({
  events: {
    "session.started": () => {
      const disabled = disabledBuiltinSkillSlugs();
      if (disabled.length === 0) return null;
      return defineInstructions({
        content: [
          "These built-in skills are disabled in app.config.ts. Do not load them:",
          ...disabled.map((slug) => `- ${slug}`),
        ].join("\n"),
      });
    },
  },
});
