import { createApp } from "../src/app.js";
import { activateEcosystem } from "../src/lib/ecosystem-activation.js";

// Vercel serverless: activate ecosystem once per cold start
// so /api/ecosystem/sources shows real health status (not "unknown").
// Runs at module load time (cold start), before first request.
let activated = false;

(async () => {
  if (!activated) {
    activated = true;
    try {
      await activateEcosystem();
    } catch (err) {
      console.error("[ecosystem] activation failed:", err);
      activated = false; // allow retry on next cold start
    }
  }
})();

const app = createApp();
export default app;