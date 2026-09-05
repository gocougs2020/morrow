import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

function offersFileNotStickyNote(reply: string | null): boolean {
  const text = String(reply ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'");
  return (
    /file|document|create_document|save (?:it |this )?(?:as |to )?(?:a )?file/.test(text) ||
    /won'?t save|will not save|not (?:saving|put|putting)|sticky[- ]note|one-off|long-term memory/.test(
      text,
    )
  );
}

export default defineEval({
  description:
    "Standing instructions: a one-off event belongs in a file, not sticky-note memory.",
  tags: ["workspace"],
  async test(t) {
    await t.send("Remember that the Smith wedding is June 6.");
    t.succeeded();
    t.notCalledTool("profile__save_memory");
    t.check(
      t.reply,
      satisfies(offersFileNotStickyNote, "offers a file or declines sticky-note memory"),
    );
  },
});
