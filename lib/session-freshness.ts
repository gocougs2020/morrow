export const SESSION_STALE_AFTER_MS = 5 * 60 * 1000;
export const SESSION_LAST_LEFT_KEY = "session-workspace-last-left-at";
export const SESSION_EXPLICIT_OPEN_KEY = "session-workspace-explicit-open";

export function sessionIdFromPath(pathname: string): string | undefined {
  const path = pathname.split("?")[0] ?? pathname;
  if (!path.startsWith("/s/")) return undefined;
  const id = path.slice(3);
  return id.length > 0 && !id.includes("/") ? id : undefined;
}

export function isSessionViewStale(
  lastLeftAt: number | null,
  now: number,
  staleAfterMs = SESSION_STALE_AFTER_MS,
): boolean {
  if (lastLeftAt == null || !Number.isFinite(lastLeftAt)) return false;
  return now - lastLeftAt >= staleAfterMs;
}

export function shouldResetStaleSession(input: {
  readonly sessionId?: string;
  readonly lastLeftAt: number | null;
  readonly now: number;
  readonly explicitOpen?: boolean;
  readonly staleAfterMs?: number;
}): boolean {
  if (!input.sessionId || input.explicitOpen) return false;
  return isSessionViewStale(input.lastLeftAt, input.now, input.staleAfterMs);
}

export function readLastLeftAt(): number | null {
  try {
    const raw = window.localStorage.getItem(SESSION_LAST_LEFT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function markSessionWorkspaceLeft(now = Date.now()) {
  try {
    window.localStorage.setItem(SESSION_LAST_LEFT_KEY, String(now));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearSessionWorkspaceLeft() {
  try {
    window.localStorage.removeItem(SESSION_LAST_LEFT_KEY);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function markExplicitSessionOpen() {
  try {
    window.localStorage.setItem(SESSION_EXPLICIT_OPEN_KEY, "1");
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function consumeExplicitSessionOpen(): boolean {
  try {
    const flagged = window.localStorage.getItem(SESSION_EXPLICIT_OPEN_KEY) === "1";
    if (flagged) window.localStorage.removeItem(SESSION_EXPLICIT_OPEN_KEY);
    return flagged;
  } catch {
    return false;
  }
}

export function hrefOpensExistingSession(href: string, origin = window.location.origin): boolean {
  try {
    const url = new URL(href, origin);
    return url.origin === origin && Boolean(sessionIdFromPath(url.pathname));
  } catch {
    return false;
  }
}
