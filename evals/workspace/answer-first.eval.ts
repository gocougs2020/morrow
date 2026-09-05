import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

export default defineEval({
  description:
    "Standing instructions: answer a first-pass writing ask without loading a skill.",
  tags: ["workspace"],
  async test(t) {
    await t.send("What's a good subject line for a thank-you email to a coworker?");
    t.succeeded();
    t.notCalledTool("load_skill");
    t.check(
      t.reply,
      satisfies(
        (reply) => String(reply ?? "").trim().length > 10,
        "drafted a subject line in chat",
      ),
    );
  },
});
