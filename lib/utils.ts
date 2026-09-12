import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** `fetch` with a JSON body. Callers still inspect the `Response` themselves. */
export function fetchJson(input: string, method: string, body: unknown): Promise<Response> {
  return fetch(input, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });

export function formatSessionUpdatedAt(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsedMs = now.getTime() - date.getTime();
  if (elapsedMs < 45_000) return "just now";

  const minutes = Math.round(elapsedMs / 60_000);
  if (minutes < 60) return relativeTime.format(-minutes, "minute");

  const hours = Math.round(elapsedMs / 3_600_000);
  if (hours < 24) return relativeTime.format(-hours, "hour");

  const days = Math.round(elapsedMs / 86_400_000);
  if (days < 30) return relativeTime.format(-days, "day");

  const months = Math.round(elapsedMs / (30.4375 * 86_400_000));
  if (months < 12) return relativeTime.format(-Math.max(1, months), "month");

  return relativeTime.format(-Math.max(1, Math.round(elapsedMs / (365.25 * 86_400_000))), "year");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}\u00a0B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}\u00a0KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}\u00a0MB`;
}

const compactNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const compactDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const elapsedMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  if (minutes < 60) return `${compactNumber.format(minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${compactNumber.format(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${compactNumber.format(days)}d`;
  return compactDate.format(date);
}
