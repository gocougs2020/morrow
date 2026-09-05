const buckets = new Map<string, { count: number; resetAt: number }>();
const pruneThreshold = 5_000;

export const RATE_LIMIT_MESSAGE = "Too many attempts. Try again in a few minutes.";

function rateLimitDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production";
}

function pruneExpired(now: number) {
  if (buckets.size <= pruneThreshold) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): boolean {
  if (rateLimitDisabled()) return true;

  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (existing.count >= opts.limit) return false;
  existing.count += 1;
  return true;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstHop = forwarded?.split(",")[0]?.trim();
  if (firstHop) return firstHop;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

export function clientKey(request: Request, extra: string): string {
  return `${extra}:${clientIp(request)}`;
}
