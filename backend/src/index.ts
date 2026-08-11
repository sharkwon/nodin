import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { activateEcosystem } from "./lib/ecosystem-activation.js";

const app = createApp();
const port = env.PORT;

app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}${env.API_PREFIX}`);
  // Activate ecosystem data pipeline (health checks, discovery, etc.)
  try {
    await activateEcosystem();
    console.log("[ecosystem] Data pipeline activated — health checks running");
  } catch (err) {
    console.error("[ecosystem] Activation failed:", err);
  }
});