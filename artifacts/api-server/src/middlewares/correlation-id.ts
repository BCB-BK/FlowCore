import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const HEADER_NAME = "x-correlation-id";

export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = (req.headers[HEADER_NAME] as string) || randomUUID();
  req.headers[HEADER_NAME] = id;
  res.setHeader(HEADER_NAME, id);
  next();
}
