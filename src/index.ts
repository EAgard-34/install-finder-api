import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env, metaEnabled } from "./config/env";
import { router } from "./routes";
import { metaWebhook } from "./domains/meta/metaWebhook";
import { errorHandler } from "./middleware/error";

const app = express();
app.set("trust proxy", 1); // Railway sits behind a proxy
app.use(helmet());
app.use(cors({ origin: false })); // mobile-only API: no browser origins
app.use(
  express.json({
    limit: "1mb",
    // Keep the exact bytes so Meta's webhook signature can be checked
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Public webhooks (signed by the sender, no Firebase login)
app.use("/webhooks", metaWebhook);
// App API (Firebase login required)
app.use("/api", router);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Installer Finder API on :${env.PORT}`);
  console.log(metaEnabled ? "Facebook lead ads webhook: on" : "Facebook lead ads webhook: off (META_* not set)");
});
