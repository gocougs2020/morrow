import { defineChannel, POST } from "eve/channels";
import eve from "./eve";

type StartBody = {
  userId?: string;
  prompt?: string;
  email?: string;
  name?: string;
  chatId?: string;
};

export default defineChannel({
  routes: [
    POST("/api/internal/email-sessions", async (request, { to }) => {
      const secret = process.env.RESEND_WEBHOOK_SECRET ?? process.env.EMAIL_SESSION_SECRET;
      if (!secret || request.headers.get("x-email-session-secret") !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }

      const body = (await request.json().catch(() => ({}))) as StartBody;
      if (!body.userId || !body.prompt?.trim()) {
        return Response.json({ error: "userId and prompt are required." }, { status: 400 });
      }

      const chatId = body.chatId?.trim();
      const session = await to(eve, chatId ? { address: chatId } : {}).send(body.prompt, {
        auth: {
          authenticator: "better-auth",
          principalId: body.userId,
          principalType: "user",
          attributes: {
            ...(body.email ? { email: body.email } : {}),
            ...(body.name ? { name: body.name } : {}),
            ...(chatId ? { chatId } : {}),
            source: "email",
          },
        },
      });

      return Response.json({ sessionId: session.id });
    }),
  ],
});
