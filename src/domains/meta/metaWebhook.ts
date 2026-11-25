import { Router, type Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { container } from "tsyringe";
import { z } from "zod";
import { env, metaEnabled } from "../../config/env";
import { MetaLeadQueue } from "../../jobs/metaLeadQueue";

export const metaWebhook = Router();

const idString = z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d{1,30}$/));

const payload = z.object({
  object: z.literal("page"),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              field: z.string().max(50),
              value: z
                .object({
                  leadgen_id: idString.optional(),
                  form_id: idString.optional(),
                  page_id: idString.optional(),
                })
                .passthrough(),
            }),
          )
          .max(100),
      }),
    )
    .max(100),
});

/** Meta signs every delivery with the app secret; reject anything else. */
function validSignature(req: Request & { rawBody?: Buffer }) {
  const header = req.header("x-hub-signature-256") ?? "";
  if (!header.startsWith("sha256=") || !req.rawBody) return false;
  const expected = createHmac("sha256", env.META_APP_SECRET!).update(req.rawBody).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Meta calls this once when you save the webhook URL in the app dashboard
metaWebhook.get("/meta", (req, res) => {
  if (!metaEnabled) return res.sendStatus(404);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && typeof token === "string" && token === env.META_VERIFY_TOKEN && typeof challenge === "string" && /^[\w-]{1,200}$/.test(challenge)) {
    return res.status(200).type("text/plain").send(challenge);
  }
  res.sendStatus(403);
});

// New lead notifications
metaWebhook.post("/meta", async (req, res) => {
  if (!metaEnabled) return res.sendStatus(404);
  if (!validSignature(req)) return res.sendStatus(401);

  const parsed = payload.safeParse(req.body);
  if (!parsed.success) return res.sendStatus(200); // not a lead event we handle; acknowledge so Meta doesn't retry

  const queue = container.resolve(MetaLeadQueue);
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field === "leadgen" && change.value.leadgen_id) {
        await queue.add(change.value.leadgen_id, change.value.form_id ?? null);
      }
    }
  }
  res.sendStatus(200);
});
