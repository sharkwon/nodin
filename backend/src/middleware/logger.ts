import { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const httpLogger = (req: Request, _res: Response, next: NextFunction) => {
  if (!isProduction) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
};
