import { inject, injectable } from "tsyringe";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { EnrichmentQueue } from "../../jobs/enrichQueue";
import {
  distributorInput,
  installerInput,
  invitationInput,
  isoDate,
  promoSendInput,
  promotionInput,
  trainingInput,
  uuid,
} from "../../validation/rules";

export const ENTITIES = ["installer", "training", "invitation", "promotion", "promosend", "distributor"] as const;
type EntityName = (typeof ENTITIES)[number];

export const pushBody = z.object({
  changes: z
    .array(
      z.object({
        entity: z.enum(ENTITIES),
        op: z.enum(["upsert", "delete"]),
        id: uuid,
        updatedAt: isoDate,
        data: z.unknown().optional(),
      }),
    )
    .max(200, "Send at most 200 changes at a time"),
});
export type PushBody = z.infer<typeof pushBody>;

type Outcome =
  | { id: string; result: "applied" }
  | { id: string; result: "stale" } // server already has a newer edit
  | { id: string; result: "rejected"; error: string; fields?: unknown };

const rejected = (id: string, error: z.ZodError): Outcome => ({
  id,
  result: "rejected",
  error: "invalid",
  fields: error.flatten().fieldErrors,
});

@injectable()
export class SyncService {
  constructor(@inject(EnrichmentQueue) private queue: EnrichmentQueue) {}

  async push(body: PushBody, userId: string): Promise<Outcome[]> {
    const out: Outcome[] = [];
    for (const change of body.changes) {
      try {
        out.push(await this.apply(change, userId));
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          out.push({ id: change.id, result: "rejected", error: "duplicate" });
        } else if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
          out.push({ id: change.id, result: "rejected", error: "missing_parent" });
        } else {
          console.error(e);
          out.push({ id: change.id, result: "rejected", error: "server_error" });
        }
      }
    }
    return out;
  }

  private model(entity: EntityName) {
    return {
      installer: prisma.installer,
      training: prisma.trainingSession,
      invitation: prisma.invitation,
      promotion: prisma.promotion,
      promosend: prisma.promoSend,
      distributor: prisma.distributor,
    }[entity] as unknown as {
      findUnique(args: { where: { id: string } }): Promise<{ updatedAt: Date } | null>;
      update(args: unknown): Promise<unknown>;
    };
  }

  private async apply(change: PushBody["changes"][number], userId: string): Promise<Outcome> {
    const incomingAt = new Date(change.updatedAt);
    const model = this.model(change.entity);
    const existing = await model.findUnique({ where: { id: change.id } });
    if (existing && existing.updatedAt > incomingAt) return { id: change.id, result: "stale" };

    if (change.op === "delete") {
      if (existing) await model.update({ where: { id: change.id }, data: { deletedAt: new Date(), updatedAt: incomingAt } });
      return { id: change.id, result: "applied" };
    }

    const raw = { ...(change.data as object), id: change.id, updatedAt: change.updatedAt };

    switch (change.entity) {
      case "installer": {
        const parsed = installerInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const { id, updatedAt, ...data } = parsed.data;
        const isNewWithSite = !existing && !!data.website;
        await prisma.installer.upsert({
          where: { id },
          update: { ...data, updatedAt: new Date(updatedAt), deletedAt: null },
          create: {
            ...data,
            id,
            updatedAt: new Date(updatedAt),
            source: "MANUAL",
            createdById: userId,
            enrichmentStatus: isNewWithSite ? "PENDING" : "NONE",
          },
        });
        if (isNewWithSite) await this.queue.add(id);
        return { id, result: "applied" };
      }

      case "training": {
        const parsed = trainingInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const { id, updatedAt, startsAt, endsAt, ...rest } = parsed.data;
        const data = { ...rest, startsAt: new Date(startsAt), endsAt: new Date(endsAt), updatedAt: new Date(updatedAt), deletedAt: null };
        await prisma.trainingSession.upsert({ where: { id }, update: data, create: { id, ...data } });
        return { id, result: "applied" };
      }

      case "promotion": {
        const parsed = promotionInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const { id, updatedAt, ...rest } = parsed.data;
        const data = { ...rest, updatedAt: new Date(updatedAt), deletedAt: null };
        await prisma.promotion.upsert({ where: { id }, update: data, create: { id, ...data } });
        return { id, result: "applied" };
      }

      case "distributor": {
        const parsed = distributorInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const { id, updatedAt, ...rest } = parsed.data;
        const data = { ...rest, updatedAt: new Date(updatedAt), deletedAt: null };
        await prisma.distributor.upsert({ where: { id }, update: data, create: { id, ...data } });
        return { id, result: "applied" };
      }

      case "promosend": {
        const parsed = promoSendInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const s = parsed.data;
        const installer = await prisma.installer.findUnique({ where: { id: s.installerId } });
        if (!installer || installer.deletedAt) return { id: s.id, result: "rejected", error: "missing_parent" };
        const data = { sentAt: new Date(s.sentAt), updatedAt: new Date(s.updatedAt), deletedAt: null };
        await prisma.promoSend.upsert({
          where: { id: s.id },
          update: data,
          create: { id: s.id, promotionId: s.promotionId, installerId: s.installerId, ...data },
        });
        return { id: s.id, result: "applied" };
      }

      case "invitation": {
        const parsed = invitationInput.safeParse(raw);
        if (!parsed.success) return rejected(change.id, parsed.error);
        const inv = parsed.data;
        const installer = await prisma.installer.findUnique({ where: { id: inv.installerId } });
        if (!installer || installer.deletedAt) return { id: inv.id, result: "rejected", error: "missing_parent" };
        if (installer.optOut && !existing) return { id: inv.id, result: "rejected", error: "opted_out" };

        const toDate = (v?: string | null) => (v ? new Date(v) : null);
        const data = {
          status: inv.status,
          invitedAt: toDate(inv.invitedAt),
          registeredAt: toDate(inv.registeredAt),
          attendedAt: toDate(inv.attendedAt),
          updatedAt: new Date(inv.updatedAt),
          deletedAt: null,
        };
        await prisma.$transaction([
          prisma.invitation.upsert({
            where: { id: inv.id },
            update: data,
            create: { id: inv.id, installerId: inv.installerId, sessionId: inv.sessionId, checkInCode: inv.checkInCode, ...data },
          }),
          // Keep the lead's pipeline status in step with its furthest invitation step
          prisma.installer.update({
            where: { id: inv.installerId },
            data: { status: this.leadStatusFor(installer.status, inv.status), updatedAt: new Date(inv.updatedAt) },
          }),
        ]);
        return { id: inv.id, result: "applied" };
      }
    }
  }

  private leadStatusFor(current: string, inv: string) {
    const order = ["NEW", "INVITED", "REGISTERED", "ATTENDED", "FIRST_ORDER"];
    if (current === "NOT_INTERESTED" || current === "FIRST_ORDER") return current as "NOT_INTERESTED" | "FIRST_ORDER";
    if (inv === "DECLINED") return current as "NEW";
    return (order.indexOf(inv) > order.indexOf(current) ? inv : current) as "INVITED";
  }

  /** Everything changed since the cursor, including soft-deletes. */
  async pull(since: Date | null) {
    const serverTime = new Date();
    const where = since
      ? { serverUpdatedAt: { gt: since, lte: serverTime } }
      : { deletedAt: null, serverUpdatedAt: { lte: serverTime } };
    const LIMIT = 5000;
    const args = { where, take: LIMIT, orderBy: { serverUpdatedAt: "asc" as const } };
    const [installers, trainings, invitations, promotions, promoSends, distributors] = await Promise.all([
      prisma.installer.findMany(args),
      prisma.trainingSession.findMany(args),
      prisma.invitation.findMany(args),
      prisma.promotion.findMany(args),
      prisma.promoSend.findMany(args),
      prisma.distributor.findMany(args),
    ]);
    const lists: { serverUpdatedAt: Date }[][] = [installers, trainings, invitations, promotions, promoSends, distributors];
    const full = lists.filter((l) => l.length === LIMIT);
    const cursor = full.length
      ? new Date(Math.min(...full.map((l) => l[l.length - 1].serverUpdatedAt.getTime())))
      : serverTime;
    return { installers, trainings, invitations, promotions, promoSends, distributors, cursor: cursor.toISOString(), more: full.length > 0 };
  }
}
