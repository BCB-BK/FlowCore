import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { AppError } from "../lib/app-error";
import { appConfig } from "../lib/config";

const isProduction = appConfig.nodeEnv === "production";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Route nicht gefunden" });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(
        { err, method: req.method, path: req.path, status: err.status },
        "Application server error",
      );
      res.status(err.status).json({
        error: isProduction ? "Interner Serverfehler" : err.message,
        ...(err.code ? { code: err.code } : {}),
      });
      return;
    }

    logger.warn(
      { err, method: req.method, path: req.path, status: err.status },
      "Handled application error",
    );
    const body: Record<string, unknown> = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.details && (err.exposeDetails || !isProduction)) {
      body.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }

  const rawStatus = (err as { status?: unknown }).status;
  const status =
    typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 600
      ? rawStatus
      : 500;

  if (status >= 500) {
    logger.error(
      { err, method: req.method, path: req.path },
      "Unhandled error",
    );
  } else {
    logger.warn(
      { err, method: req.method, path: req.path, status },
      "Handled error (non-AppError)",
    );
  }

  res.status(status).json({
    error: isProduction && status >= 500 ? "Interner Serverfehler" : err.message,
  });
}
