import { Queue } from "bullmq";
import { singleton } from "tsyringe";
import { redisConnection } from "./enrichQueue";

export const META_LEAD_QUEUE = "meta-leads";

/** Webhook replies to Meta straight away; the lead is fetched here, with retries. */
@singleton()
export class MetaLeadQueue {
  private queue = new Queue(META_LEAD_QUEUE, { connection: redisConnection() });

  async add(leadgenId: string, formId: string | null) {
    await this.queue.add(
      "fetch-lead",
      { leadgenId, formId },
      {
        jobId: `lead-${leadgenId}`, // Meta may deliver the same lead more than once
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 5000,
        removeOnFail: 5000,
      },
    );
  }
}
