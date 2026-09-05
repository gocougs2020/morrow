import { isAPIError } from "better-auth/api";

export function formField(formData: FormData, key: string, options?: { trim?: boolean }): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return options?.trim === false ? value : value.trim();
}

export function authFormErrorMessage(error: unknown): string {
  if (isAPIError(error) && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Unable to authenticate. Check your details and try again.";
}

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
