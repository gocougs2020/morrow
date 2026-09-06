import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.join(process.cwd(), ".eve");
const ARTIFACT = path.join(ARTIFACT_DIR, "vercel-billing-plan");
const COMPILED = path.join(process.cwd(), "lib", "compiled-vercel-plan.ts");

function token() {
  return process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_ACCESS_TOKEN?.trim() || "";
}

function planFromPayload(payload) {
  const raw = payload?.billing?.plan ?? payload?.user?.billing?.plan;
  if (typeof raw !== "string") return null;
  const plan = raw.trim().toLowerCase();
  if (plan === "hobby") return "hobby";
  if (plan === "pro" || plan === "enterprise") return "pro";
  return null;
}

async function vercelJson(pathname, secret) {
  const response = await fetch(`https://api.vercel.com${pathname}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) throw new Error(`${pathname} ${response.status}`);
  return response.json();
}

async function resolvePlan() {
  const secret = token();
  if (!secret) return "hobby";
  const orgId = process.env.VERCEL_ORG_ID?.trim() || process.env.VERCEL_TEAM_ID?.trim();
  try {
    if (orgId) {
      const team = planFromPayload(await vercelJson(`/v2/teams/${orgId}`, secret));
      if (team) return team;
    }
    const user = planFromPayload(await vercelJson("/v2/user", secret));
    if (user) return user;
  } catch (error) {
    console.warn("[vercel-plan] build lookup failed; assuming Hobby", error);
  }
  return "hobby";
}

const plan = await resolvePlan();
mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(ARTIFACT, `${plan}\n`);
writeFileSync(
  COMPILED,
  [
    "/** Written by scripts/resolve-vercel-plan.mjs before a production build. Default Hobby. */",
    `export const COMPILED_VERCEL_BILLING_PLAN = "${plan}" as "hobby" | "pro";`,
    "",
  ].join("\n"),
);
process.env.VERCEL_BILLING_PLAN = plan;
console.info(`[vercel-plan] dispatcher will compile as ${plan}`);
