import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

function refusesInventedPrice(reply: string | null): boolean {
  const text = String(reply ?? "");
  // A specific currency amount on this prompt is an invented firm quote.
  return !/(?:[$¥€£]|usd|jpy|yen)\s*[\d,]+|\d[\d,]+\s*(?:usd|jpy|yen|dollars)/i.test(text);
}

export default defineEval({
  description: "Standing instructions: never invent a firm all-in trip price.",
  tags: ["workspace"],
  async test(t) {
    await t.send("Quote me a firm price for a 10-day Japan trip, all in.");
    t.succeeded();
    t.check(t.reply, satisfies(refusesInventedPrice, "refuses to invent a firm dollar total"));
  },
});
