import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  ACCESS_DENIED_MESSAGE,
  isAccessEmailAllowed,
  SIGNUP_NOT_ALLOWED_MESSAGE,
} from "@/lib/access";
import { getNeonDb, getSqliteDb, hasNeon } from "@/lib/db";
import { pgAuthSchema, sqliteAuthSchema } from "@/lib/db/schema";
import { findUserById } from "@/lib/email-users";

const allowedHosts = ["localhost:*", "127.0.0.1:*", "*.vercel.app"];

export class MissingAuthSecretError extends Error {
  constructor() {
    super(
      "BETTER_AUTH_SECRET is required. Copy .env.example to .env.local and set BETTER_AUTH_SECRET to a random 32+ character string, for example: openssl rand -base64 32. See README.md.",
    );
    this.name = "MissingAuthSecretError";
  }
}

function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new MissingAuthSecretError();
  }
  return secret;
}

function emailFromUnknown(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const email = (value as { email?: unknown }).email;
  return typeof email === "string" ? email : "";
}

function createAuth() {
  const secret = requireAuthSecret();
  const fallbackBaseURL = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";

  const shared = {
    secret,
    baseURL: {
      allowedHosts,
      fallback: fallbackBaseURL,
    },
    trustedOrigins: [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://*.vercel.app",
    ],
    emailAndPassword: { enabled: true },
    plugins: [nextCookies()],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
          if (!isAccessEmailAllowed(email)) {
            throw new APIError("FORBIDDEN", { message: SIGNUP_NOT_ALLOWED_MESSAGE });
          }
          return;
        }
        if (ctx.path === "/sign-in/email") {
          const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
          if (!isAccessEmailAllowed(email)) {
            throw new APIError("FORBIDDEN", { message: ACCESS_DENIED_MESSAGE });
          }
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-out") return;
        const returned = ctx.context.returned;
        const email = emailFromUnknown(returned) || emailFromUnknown(
          returned && typeof returned === "object"
            ? (returned as { user?: unknown }).user
            : undefined,
        );
        if (email && !isAccessEmailAllowed(email)) {
          throw new APIError("FORBIDDEN", { message: ACCESS_DENIED_MESSAGE });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: { email: string }) => {
            if (!isAccessEmailAllowed(user.email)) {
              throw new APIError("FORBIDDEN", { message: SIGNUP_NOT_ALLOWED_MESSAGE });
            }
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session: { userId: string }) => {
            const user = await findUserById(session.userId);
            if (user && !isAccessEmailAllowed(user.email)) {
              throw new APIError("FORBIDDEN", { message: ACCESS_DENIED_MESSAGE });
            }
            return true;
          },
        },
      },
    },
  };

  if (hasNeon()) {
    return betterAuth({
      ...shared,
      database: drizzleAdapter(getNeonDb(), {
        provider: "pg",
        schema: pgAuthSchema,
      }),
    });
  }

  return betterAuth({
    ...shared,
    database: drizzleAdapter(getSqliteDb(), {
      provider: "sqlite",
      schema: sqliteAuthSchema,
    }),
  });
}

let authSingleton: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authSingleton ??= createAuth();
  return authSingleton;
}

export async function sessionIfAllowed<T extends { user: { email: string } } | null>(
  session: T,
  headers?: Headers,
): Promise<T | null> {
  if (!session) return null;
  if (isAccessEmailAllowed(session.user.email)) return session;
  if (headers) {
    try {
      await getAuth().api.signOut({ headers });
    } catch {
      // Cookie may already be invalid.
    }
  }
  return null;
}
