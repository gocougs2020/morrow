import { isAPIError } from "better-auth/api";
import { friendlyAuthError } from "@/lib/auth-email";

export function formField(formData: FormData, key: string, options?: { trim?: boolean }): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return options?.trim === false ? value : value.trim();
}

function rawAuthErrorText(error: unknown): string | undefined {
  if (typeof error === "string") return error.trim() || undefined;
  if (isAPIError(error) && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return undefined;
}

export function authFormErrorMessage(error: unknown): string {
  const raw = rawAuthErrorText(error);
  if (!raw) return "Unable to authenticate. Check your details and try again.";
  return friendlyAuthError(raw) ?? raw;
}

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
