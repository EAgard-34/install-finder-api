import "dotenv/config";
import { z } from "zod";
import { COUNTRY_CODES } from "../validation/countries";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  GOOGLE_PLACES_API_KEY: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  PLACES_SEARCH_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(1000).default(60),
  // Meta lead ads (optional: the webhook is switched off unless all three are set)
  META_APP_SECRET: optional,
  META_VERIFY_TOKEN: optional.refine((v) => !v || v.length >= 16, "META_VERIFY_TOKEN must be at least 16 characters"),
  META_PAGE_ACCESS_TOKEN: optional,
  META_GRAPH_VERSION: z
    .string()
    .regex(/^v\d{2}\.\d$/, "META_GRAPH_VERSION must look like v26.0")
    .default("v26.0"),
  META_DEFAULT_COUNTRY: z.enum(COUNTRY_CODES).default("TT"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  FIREBASE_PRIVATE_KEY: parsed.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

export const metaEnabled = Boolean(env.META_APP_SECRET && env.META_VERIFY_TOKEN && env.META_PAGE_ACCESS_TOKEN);
