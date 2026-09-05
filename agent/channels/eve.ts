import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

function betterAuthSession(): AuthFn<Request> {
  return async (request) => {
    const { getAuth, sessionIfAllowed } = await import("../../lib/auth");
    const { ensureNeonAuthSchema } = await import("../../lib/db");
    await ensureNeonAuthSchema();
    const session = await sessionIfAllowed(
      await getAuth().api.getSession({ headers: request.headers }),
      request.headers,
    );
    if (!session) return null;
    return {
      authenticator: "better-auth",
      principalId: session.user.id,
      principalType: "user",
      attributes: {
        email: session.user.email,
        name: session.user.name,
      },
    };
  };
}

export default eveChannel({
  auth: [betterAuthSession(), vercelOidc(), localDev()],
});
