import { Queue } from "bullmq";
import IORedis from "ioredis";
import { singleton } from "tsyringe";
import { env } from "../config/env";

export const ENRICH_QUEUE = "installer-enrichment";

export function redisConnection() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

@singleton()
export class EnrichmentQueue {
  private queue = new Queue(ENRICH_QUEUE, { connection: redisConnection() });

  async add(installerId: string) {
    await this.queue.add(
      "enrich",
      { installerId },
      {
        jobId: `enrich-${installerId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }
}
