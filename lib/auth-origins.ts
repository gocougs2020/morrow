export function authOrigins() {
  const fallback = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
  const hosts = ["localhost:*", "127.0.0.1:*"];
  const origins = ["http://localhost:*", "http://127.0.0.1:*"];

  try {
    const url = new URL(fallback);
    if (url.hostname) hosts.push(url.hostname);
    origins.push(url.origin);
  } catch {
    // keep fallback only
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview") {
    hosts.push("*.vercel.app");
    origins.push("https://*.vercel.app");
  }

  return { hosts, origins, fallback };
}
