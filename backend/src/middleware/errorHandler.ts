import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (!isProduction) {
    console.error(err);
  }
  res.status(500).json({
    error: isProduction ? "Internal Server Error" : err.message || "Internal Server Error",
  });
};
