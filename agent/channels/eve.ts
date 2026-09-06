import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import {
  SCHEDULE_DISPATCH_CHAT_HEADER,
  SCHEDULE_DISPATCH_JOB_HEADER,
  SCHEDULE_DISPATCH_REMINDER_HEADER,
  SCHEDULE_DISPATCH_SECRET_HEADER,
  SCHEDULE_DISPATCH_USER_HEADER,
  scheduleDispatchSecret,
} from "../../lib/dispatch-jobs";
import { findUserById } from "../../lib/email-users";

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

function scheduleDispatchAuth(): AuthFn<Request> {
  return async (request) => {
    const secret = scheduleDispatchSecret();
    if (!secret || request.headers.get(SCHEDULE_DISPATCH_SECRET_HEADER) !== secret) {
      return null;
    }
    const userId = request.headers.get(SCHEDULE_DISPATCH_USER_HEADER)?.trim();
    if (!userId) return null;
    const owner = await findUserById(userId);
    const chatId = request.headers.get(SCHEDULE_DISPATCH_CHAT_HEADER)?.trim();
    const scheduleId = request.headers.get(SCHEDULE_DISPATCH_JOB_HEADER)?.trim();
    const reminder = request.headers.get(SCHEDULE_DISPATCH_REMINDER_HEADER) === "1";
    return {
      authenticator: "better-auth",
      principalId: userId,
      principalType: "user",
      attributes: {
        source: "schedule",
        ...(reminder ? { reminder: "1" } : {}),
        ...(owner?.email ? { email: owner.email } : {}),
        ...(owner?.name ? { name: owner.name } : {}),
        ...(chatId ? { chatId } : {}),
        ...(scheduleId ? { scheduleId } : {}),
      },
    };
  };
}

export default eveChannel({
  auth: [scheduleDispatchAuth(), betterAuthSession(), vercelOidc(), localDev()],
});
