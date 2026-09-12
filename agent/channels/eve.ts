import type { UserContent } from "ai";
import type { ChannelReceiveContext } from "eve/channels";
import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import type { SessionAuthContext } from "eve/context";
import {
  SCHEDULE_DISPATCH_CHAT_HEADER,
  SCHEDULE_DISPATCH_JOB_HEADER,
  SCHEDULE_DISPATCH_REMINDER_HEADER,
  SCHEDULE_DISPATCH_SECRET_HEADER,
  SCHEDULE_DISPATCH_USER_HEADER,
  scheduleDispatchSecret,
  scheduleSessionAuth,
} from "../../lib/dispatch-jobs";
import { findUserById } from "../../lib/email-users";
import { eveReceiveAddress } from "../../lib/eve-receive";

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
    return scheduleSessionAuth({
      userId,
      email: owner?.email,
      name: owner?.name,
      chatId: request.headers.get(SCHEDULE_DISPATCH_CHAT_HEADER)?.trim(),
      scheduleId: request.headers.get(SCHEDULE_DISPATCH_JOB_HEADER)?.trim(),
      reminder: request.headers.get(SCHEDULE_DISPATCH_REMINDER_HEADER) === "1",
    });
  };
}

const channel = eveChannel({
  auth: [scheduleDispatchAuth(), betterAuthSession(), vercelOidc(), localDev()],
});

// eveChannel() has no receive option. Schedules and the email channel start
// web sessions with to(eve, { address }).send(...).
export default Object.assign(channel, {
  receive(
    input: {
      message: string | UserContent;
      target: Readonly<Record<string, unknown>>;
      auth: SessionAuthContext | null;
    },
    { from }: ChannelReceiveContext,
  ) {
    return from(eveReceiveAddress(input.target)).send(input.message, { auth: input.auth });
  },
});
