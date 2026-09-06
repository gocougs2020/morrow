import { defineDynamic, defineInstructions } from "eve/instructions";
import { resolveHostSchedulePlan, schedulePlanInstruction } from "../../lib/vercel-plan";
import { accountEmail, userFromAuth } from "../lib/identity";
import { settingsForPrincipal } from "../lib/models";

export default defineDynamic({
  events: {
    "session.started": async (_event, ctx) => {
      const personal = await settingsForPrincipal(ctx.session.auth.current?.principalId);
      const userOverlay = personal.instructionOverlay.trim();
      return userOverlay
        ? defineInstructions({
            content: `User-specific instructions:\n\n${userOverlay}`,
          })
        : null;
    },
    "turn.started": async (_event, ctx) => {
      const user = userFromAuth(ctx.session.auth.current);
      const email = user ? await accountEmail(user) : null;
      const plan = await resolveHostSchedulePlan();
      const parts = [schedulePlanInstruction(plan)];
      if (email) {
        parts.push(
          `Signed-in user email: ${email}. When they ask to email themselves, send to this address. Do not ask them to type it.`,
        );
      }
      return defineInstructions({
        content: parts.join("\n\n"),
      });
    },
  },
});
