import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { firebaseAuth } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Verifies the Firebase ID token. Only people an admin has added (by email)
 * can use the API; their Firebase UID is linked on first sign-in.
 * Internal DB id (User.id) is what the rest of the code uses - never the UID.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new HttpError(401, "Not signed in");

    const decoded = await firebaseAuth.verifyIdToken(token, true).catch(() => {
      throw new HttpError(401, "Session expired, please sign in again");
    });

    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user && decoded.email && decoded.email_verified !== false) {
      const byEmail = await prisma.user.findUnique({ where: { email: decoded.email.toLowerCase() } });
      if (byEmail && !byEmail.firebaseUid) {
        user = await prisma.user.update({ where: { id: byEmail.id }, data: { firebaseUid: decoded.uid } });
      }
    }
    if (!user || !user.active) throw new HttpError(403, "Your account doesn't have access to this app");

    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return next(new HttpError(403, "Admins only"));
  next();
}
