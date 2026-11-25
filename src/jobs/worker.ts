import "reflect-metadata";
import { Worker } from "bullmq";
import { container } from "tsyringe";
import { prisma } from "../lib/prisma";
import { metaEnabled } from "../config/env";
import { classifyTier, detectBrands } from "../lib/classify";
import { ENRICH_QUEUE, redisConnection } from "./enrichQueue";
import { META_LEAD_QUEUE } from "./metaLeadQueue";
import { scrapeWebsite } from "./websiteScraper";
import { MetaLeadService } from "../domains/meta/MetaLeadService";

/**
 * Website enrichment: visits each installer's website and fills in blanks only:
 * email, WhatsApp/phone, Facebook link, brands carried, Commercial/Domestic guess.
 * Never overwrites something a person typed in.
 */
const enrichWorker = new Worker(
  ENRICH_QUEUE,
  async (job) => {
    const { installerId } = job.data as { installerId: string };
    const installer = await prisma.installer.findUnique({ where: { id: installerId } });
    if (!installer?.website || installer.deletedAt) return;

    try {
      const found = await scrapeWebsite(installer.website, installer.country);
      const brands = [...new Set([...installer.brands, ...detectBrands(found.text)])];
      const tier = installer.tier === "UNKNOWN" ? classifyTier(`${installer.name} ${found.text}`) : installer.tier;

      await prisma.installer.update({
        where: { id: installerId },
        data: {
          email: installer.email ?? found.emails[0] ?? null,
          phone: installer.phone ?? found.phones[0] ?? null,
          whatsapp: installer.whatsapp ?? installer.phone ?? found.phones[0] ?? null,
          facebookUrl: installer.facebookUrl ?? found.facebookUrl,
          brands,
          tier,
          enrichmentStatus: "DONE",
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await prisma.installer.update({ where: { id: installerId }, data: { enrichmentStatus: "FAILED" } });
      }
      throw e;
    }
  },
  { connection: redisConnection(), concurrency: 3, limiter: { max: 30, duration: 60_000 } },
);
enrichWorker.on("failed", (job, err) => console.warn(`Enrichment failed for ${job?.data?.installerId}: ${err.message}`));

/** Facebook lead ads: fetch each new lead from Meta and save it as an installer. */
if (metaEnabled) {
  const leadWorker = new Worker(
    META_LEAD_QUEUE,
    async (job) => {
      const { leadgenId } = job.data as { leadgenId: string };
      const installer = await container.resolve(MetaLeadService).importLead(leadgenId);
      console.log(`Facebook lead ${leadgenId} -> ${installer.name}`);
    },
    { connection: redisConnection(), concurrency: 2 },
  );
  leadWorker.on("failed", (job, err) => console.warn(`Facebook lead ${job?.data?.leadgenId} failed: ${err.message}`));
}

console.log(`Worker running (website enrichment${metaEnabled ? " + Facebook leads" : ""})`);
