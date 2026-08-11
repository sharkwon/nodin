import express, { Application } from "express";
import cors from "cors";
import compression from "compression";
import "express-async-errors";
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

  app.use(errorHandler);
  return app;
};