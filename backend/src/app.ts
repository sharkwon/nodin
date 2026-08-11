import express, { Application } from "express";
import cors from "cors";
import compression from "compression";
import "express-async-errors";
import path from "node:path";
import fs from "node:fs";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { httpLogger } from "./middleware/logger.js";
import { insightRouter } from "./modules/nodin.js";
import { ecosystemRouter } from "./modules/ecosystem.js";
import { networkRouter } from "./modules/network.js";

export const createApp = (): Application => {
  const app = express();
  app.use(httpLogger);
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== "*",
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  app.get(`${env.API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(`${env.API_PREFIX}/insight`, insightRouter);
  app.use(`${env.API_PREFIX}/ecosystem`, ecosystemRouter);
  app.use(`${env.API_PREFIX}/network`, networkRouter);
  app.use(`${env.API_PREFIX}/report`, networkRouter);

  // Serve the built frontend (single-service deploy). STATIC_DIR overrides the
  // default of ../frontend/dist relative to the backend working directory.
  const staticDir =
    process.env.STATIC_DIR ?? path.resolve(process.cwd(), "../frontend/dist");
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // SPA fallback: any non-API route serves index.html
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
};