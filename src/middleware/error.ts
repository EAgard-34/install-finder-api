import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.details });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
