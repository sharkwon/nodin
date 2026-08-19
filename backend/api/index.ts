import { createApp } from "../src/app.js";
import { activateEcosystem } from "../src/lib/ecosystem-activation.js";

// Vercel serverless: activate ecosystem once per cold start
// so /api/ecosystem/sources shows real health status (not "unknown").
// Module-level async can be flaky in serverless — activate lazily
// on first request instead, then reuse the warm instance.
let activated = false;
let app: ReturnType<typeof createApp> | null = null;

function getApp() {
  if (!app) app = createApp();
  return app;
}

async function ensureActivated() {
  if (activated) return;
  activated = true;
  try {
    await activateEcosystem();
  } catch (err) {
    console.error("[ecosystem] activation failed:", err);
    activated = false; // allow retry on next request
  }
}

export default async function handler(req: any, res: any) {
  // Fire-and-forget activation — don't block first response on health pings
  ensureActivated().catch(() => {});
  return getApp()(req, res);
}
