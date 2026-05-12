import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

const HEADER = "X-Request-Id";
const HEADER_LOWER = HEADER.toLowerCase();

export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers[HEADER_LOWER];
    const value =
      typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();

    (req as Request & { id: string }).id = value;
    res.setHeader(HEADER, value);
    next();
  };
}
