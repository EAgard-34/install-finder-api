import { Router } from "express";
import { container } from "tsyringe";
import { z } from "zod";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { HttpError } from "./lib/errors";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { parse } from "./middleware/validate";
import { PlacesService } from "./domains/places/PlacesService";
import { SyncService, pushBody } from "./domains/sync/SyncService";
import { pageQuery, placesSearchInput, userInput, uuid } from "./validation/rules";

export const router = Router();
type Handler = (req: import("express").Request, res: import("express").Response) => Promise<unknown>;
const h = (fn: Handler) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) =>
  fn(req, res).catch(next);

router.get("/health", (_req, res) => res.json({ ok: true }));

router.use(requireAuth);

router.get("/me", h(async (req, res) => {
  const { id, email, name, role } = req.user!;
  res.json({ id, email, name, role });
}));

/* ---- Google Places search ----
 * Each keyword is one paid Google request, so the hourly budget counts keywords, not taps.
 * (Kept in memory: fine for one API instance; move to Redis if you run several.)
 */
const searchBudget = new Map<string, { windowStart: number; used: number }>();
function takeSearchBudget(userId: string, cost: number) {
  const now = Date.now();
  const b = searchBudget.get(userId);
  const fresh = !b || now - b.windowStart > 60 * 60 * 1000;
  const used = fresh ? 0 : b!.used;
  if (used + cost > env.PLACES_SEARCH_LIMIT_PER_HOUR) {
    throw new HttpError(429, "Search limit reached for this hour, try again later");
  }
  searchBudget.set(userId, { windowStart: fresh ? now : b!.windowStart, used: used + cost });
}

router.post("/places/search", h(async (req, res) => {
  const input = parse(placesSearchInput, req.body);
  takeSearchBudget(req.user!.id, input.keywords.length);
  const result = await container.resolve(PlacesService).search(input, req.user!.id);
  res.json(result);
}));

/* ---- Offline sync ---- */
router.post("/sync/push", h(async (req, res) => {
  const body = parse(pushBody, req.body);
  res.json({ results: await container.resolve(SyncService).push(body, req.user!.id) });
}));
router.get("/sync/pull", h(async (req, res) => {
  const { since } = parse(z.object({ since: z.string().datetime({ offset: true }).optional() }), req.query);
  res.json(await container.resolve(SyncService).pull(since ? new Date(since) : null));
}));

/* ---- Read-only list (the app normally reads its local copy) ---- */
router.get("/installers", h(async (req, res) => {
  const q = parse(pageQuery, req.query);
  const where = {
    deletedAt: null,
    ...(q.country ? { country: q.country } : {}),
    ...(q.tier ? { tier: q.tier } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.source ? { source: q.source } : {}),
    ...(q.registeredBusiness !== undefined ? { registeredBusiness: q.registeredBusiness } : {}),
    ...(q.dahuaPartner !== undefined ? { dahuaPartner: q.dahuaPartner } : {}),
    ...(q.search ? { name: { contains: q.search, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.installer.findMany({ where, orderBy: { name: "asc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.installer.count({ where }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}));

/* ---- Team members (admin only). Create the matching Firebase login in the console. ---- */
router.get("/users", requireAdmin, h(async (_req, res) => {
  res.json(await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, email: true, name: true, role: true, active: true } }));
}));
router.post("/users", requireAdmin, h(async (req, res) => {
  const input = parse(userInput, req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new HttpError(409, "That email is already on the team");
  res.status(201).json(await prisma.user.create({ data: input }));
}));
router.patch("/users/:id", requireAdmin, h(async (req, res) => {
  const id = parse(uuid, req.params.id);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  if (id === req.user!.id) throw new HttpError(400, "You can't deactivate yourself");
  res.json(await prisma.user.update({ where: { id }, data: { active } }));
}));
