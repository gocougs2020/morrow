import { defineDynamic, defineInstructions } from "eve/instructions";
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
      if (!email) return null;
      return defineInstructions({
        content: `Signed-in user email: ${email}. When they ask to email themselves, send to this address. Do not ask them to type it.`,
      });
    },
  },
});
