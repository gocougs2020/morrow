import { randomBytes } from "node:crypto";

/** Same strength as `openssl rand -base64 32`. */
export function generateAuthSecret(): string {
  return randomBytes(32).toString("base64");
}

export function isAuthSecretConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}
