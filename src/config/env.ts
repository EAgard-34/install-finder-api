import "dotenv/config";
import { existsSync, readFileSync } from "fs";
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
  // Firebase Admin: EITHER point to the downloaded service-account JSON file (easiest locally)...
  FIREBASE_SERVICE_ACCOUNT_FILE: optional,
  // ...OR set these three (needed on Railway, where there is no file)
  FIREBASE_PROJECT_ID: optional,
  FIREBASE_CLIENT_EMAIL: optional,
  FIREBASE_PRIVATE_KEY: optional,
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

function fail(message: string): never {
  console.error(`Firebase settings problem: ${message}`);
  process.exit(1);
}

/** Strip a trailing comma and wrapping quotes left over from copying out of the JSON file. */
function unwrap(v: string): string {
  let s = v.trim().replace(/,$/, "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s.trim();
}

/**
 * Accepts the private key however it was pasted: with literal \n, with real line breaks,
 * with \r\n (Windows), wrapped in quotes, or base64-encoded. Never prints the key itself.
 */
function normalizePrivateKey(raw: string): string {
  let k = unwrap(raw);
  if (/^LS0tLS1CRUdJTi/.test(k)) k = Buffer.from(k, "base64").toString("utf8"); // whole PEM base64-encoded
  k = k.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  k = k.trim() + "\n";

  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";
  if (!k.startsWith(begin)) {
    fail(
      `FIREBASE_PRIVATE_KEY must start with ${begin}. It currently starts with "${k.slice(0, 12)}…". ` +
        "Copy the whole private_key value from the JSON file, or use FIREBASE_SERVICE_ACCOUNT_FILE instead.",
    );
  }
  if (!k.trimEnd().endsWith(end)) {
    fail(`FIREBASE_PRIVATE_KEY must end with ${end}. It looks cut off (length ${k.length}; a full key is about 1,700 characters).`);
  }
  return k;
}

function firebaseCredentials() {
  const d = parsed.data!;
  if (d.FIREBASE_SERVICE_ACCOUNT_FILE) {
    const path = unwrap(d.FIREBASE_SERVICE_ACCOUNT_FILE);
    if (!existsSync(path)) fail(`FIREBASE_SERVICE_ACCOUNT_FILE points to a file that doesn't exist: ${path}`);
    let json: { project_id?: string; client_email?: string; private_key?: string; type?: string };
    try {
      json = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      fail(`FIREBASE_SERVICE_ACCOUNT_FILE is not a valid JSON file: ${path}`);
    }
    if (json.type !== "service_account" || !json.project_id || !json.client_email || !json.private_key) {
      fail("That JSON file is not a Firebase service-account key. Download it from Project settings → Service accounts.");
    }
    return { projectId: json.project_id, clientEmail: json.client_email, privateKey: normalizePrivateKey(json.private_key) };
  }

  if (!d.FIREBASE_PROJECT_ID || !d.FIREBASE_CLIENT_EMAIL || !d.FIREBASE_PRIVATE_KEY) {
    fail("set FIREBASE_SERVICE_ACCOUNT_FILE, or all three of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  }
  const clientEmail = unwrap(d.FIREBASE_CLIENT_EMAIL);
  if (!z.string().email().safeParse(clientEmail).success || !clientEmail.endsWith(".iam.gserviceaccount.com")) {
    fail("FIREBASE_CLIENT_EMAIL should look like firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com");
  }
  return {
    projectId: unwrap(d.FIREBASE_PROJECT_ID),
    clientEmail,
    privateKey: normalizePrivateKey(d.FIREBASE_PRIVATE_KEY),
  };
}

const fb = firebaseCredentials();

export const env = {
  ...parsed.data,
  FIREBASE_PROJECT_ID: fb.projectId,
  FIREBASE_CLIENT_EMAIL: fb.clientEmail,
  FIREBASE_PRIVATE_KEY: fb.privateKey,
};

export const metaEnabled = Boolean(env.META_APP_SECRET && env.META_VERIFY_TOKEN && env.META_PAGE_ACCESS_TOKEN);
