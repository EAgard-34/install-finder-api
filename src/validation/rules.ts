/**
 * Validation rules. The mobile app has an identical copy at
 * mobile/src/validation/rules.ts - keep the two in step.
 * Messages are translation keys ("v.tooShort:2" = key + number) so the app
 * can show them in English, Spanish or French.
 */
import { z } from "zod";
import { COUNTRY_CODES, isValidPhone } from "./countries";

export const BRANDS = [
  "Dahua",
  "Hikvision",
  "HiLook",
  "Epcom",
  "Uniview",
  "Ezviz",
  "Imou",
  "Tiandy",
  "Provision-ISR",
  "Milesight",
  "Reolink",
  "TP-Link VIGI",
  "Axis",
  "Hanwha",
  "Bosch",
  "Honeywell",
  "Ajax",
  "DSC",
  "Paradox",
  "HID",
  "Suprema",
  "ZKTeco",
  "Paxton",
  "Akuvox",
  "2N",
  "Ubiquiti",
] as const;

export const TIERS = ["COMMERCIAL", "DOMESTIC", "BOTH", "UNKNOWN"] as const;
export const SOURCES = ["FACEBOOK_LEAD", "GOOGLE_PLACES", "MANUAL"] as const;
export const INSTALLER_STATUSES = [
  "NEW",
  "INVITED",
  "REGISTERED",
  "ATTENDED",
  "FIRST_ORDER",
  "NOT_INTERESTED",
] as const;
export const INVITATION_STATUSES = ["INVITED", "REGISTERED", "ATTENDED", "DECLINED"] as const;
export const MAX_KEYWORDS_PER_SEARCH = 8;

/** E.164: + then 7-15 digits. The country-specific check runs on the whole object. */
export const E164_REGEX = /^\+\d{7,15}$/;
/** Letters (incl. accents), digits, spaces and common business-name punctuation */
export const NAME_REGEX = /^[\p{L}\p{N} &.,'()\/\-]+$/u;
/** Free text: no control characters or angle brackets */
export const TEXT_REGEX = /^[^<>\u0000-\u0008\u000B\u000C\u000E-\u001F]*$/;
export const CHECKIN_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;
/** Company registration number: letters, digits, space, / - . (2-30 characters) */
export const REG_NO_REGEX = /^[A-Za-z0-9][A-Za-z0-9 \/.\-]{1,29}$/;
/** Placeholders allowed in a promo message */
export const PROMO_PLACEHOLDERS = ["{{name}}"] as const;
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "m.facebook.com", "instagram.com"];

const trimmed = (min: number, max: number) =>
  z
    .string({ invalid_type_error: "v.notText" })
    .trim()
    .min(min, `v.tooShort:${min}`)
    .max(max, `v.tooLong:${max}`);

export const uuid = z.string().uuid("v.invalid");
export const country = z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "v.country" }) });

const e164 = z.string().trim().regex(E164_REGEX, "v.phone");
const optionalPhone = z
  .union([e164, z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const installerName = trimmed(2, 120).regex(NAME_REGEX, "v.badChars");

export const email = z.string().trim().toLowerCase().max(254, "v.tooLong:254").email("v.email");
export const optionalEmail = z
  .union([email, z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const httpUrl = z
  .string()
  .trim()
  .max(2048, "v.tooLong:2048")
  .url("v.link")
  .refine((v) => /^https?:\/\//i.test(v), "v.link");

export const optionalWebsite = z
  .union([httpUrl, z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const optionalSocialUrl = z
  .union([
    httpUrl.refine((v) => {
      try {
        const host = new URL(v).hostname.replace(/^www\./, "").toLowerCase();
        return SOCIAL_HOSTS.includes(host);
      } catch {
        return false;
      }
    }, "v.social"),
    z.literal(""),
  ])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const optionalText = (max: number) =>
  z
    .union([trimmed(1, max).regex(TEXT_REGEX, "v.badChars"), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Town / parish / district: free text so every country works */
export const optionalArea = z
  .union([trimmed(2, 60).regex(NAME_REGEX, "v.badChars"), z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const isoDate = z.string().datetime({ offset: true, message: "v.date" });

export const installerInput = z
  .object({
    id: uuid,
    country,
    name: installerName,
    phone: optionalPhone,
    whatsapp: optionalPhone,
    email: optionalEmail,
    website: optionalWebsite,
    facebookUrl: optionalSocialUrl,
    address: optionalText(250),
    area: optionalArea,
    tier: z.enum(TIERS).default("UNKNOWN"),
    brands: z.array(z.enum(BRANDS)).max(BRANDS.length).default([]),
    status: z.enum(INSTALLER_STATUSES).default("NEW"),
    notes: optionalText(1000),
    optOut: z.boolean().default(false),
    // Badges: legally registered business (with its registration number) and Dahua partner
    registeredBusiness: z.boolean().default(false),
    businessRegNo: z
      .union([z.string().trim().toUpperCase().regex(REG_NO_REGEX, "v.regNo"), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    dahuaPartner: z.boolean().default(false),
    updatedAt: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.registeredBusiness && !v.businessRegNo) {
      ctx.addIssue({ code: "custom", path: ["businessRegNo"], message: "v.regNoRequired" });
    }
    // Phone must belong to the chosen country (right area code / length)
    for (const key of ["phone", "whatsapp"] as const) {
      const p = v[key];
      if (p && !isValidPhone(p, v.country)) ctx.addIssue({ code: "custom", path: [key], message: "v.phoneCountry" });
    }
  });
export type InstallerInput = z.infer<typeof installerInput>;

export const trainingInput = z
  .object({
    id: uuid,
    country,
    title: trimmed(3, 120).regex(TEXT_REGEX, "v.badChars"),
    venue: trimmed(3, 200).regex(TEXT_REGEX, "v.badChars"),
    startsAt: isoDate,
    endsAt: isoDate,
    capacity: z
      .number({ invalid_type_error: "v.number" })
      .int("v.wholeNumber")
      .min(1, "v.min:1")
      .max(500, "v.max:500"),
    notes: optionalText(1000),
    updatedAt: isoDate,
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "v.endAfterStart",
    path: ["endsAt"],
  })
  .refine((v) => new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime() <= 12 * 3600_000, {
    message: "v.max12h",
    path: ["endsAt"],
  });
export type TrainingInput = z.infer<typeof trainingInput>;

export const invitationInput = z.object({
  id: uuid,
  installerId: uuid,
  sessionId: uuid,
  status: z.enum(INVITATION_STATUSES).default("INVITED"),
  checkInCode: z.string().regex(CHECKIN_CODE_REGEX, "v.code"),
  invitedAt: isoDate.optional().nullable(),
  registeredAt: isoDate.optional().nullable(),
  attendedAt: isoDate.optional().nullable(),
  updatedAt: isoDate,
});
export type InvitationInput = z.infer<typeof invitationInput>;

export const promotionInput = z.object({
  id: uuid,
  country,
  title: trimmed(3, 80).regex(TEXT_REGEX, "v.badChars"),
  // Plain text that goes into WhatsApp; {{name}} becomes the installer's name
  message: trimmed(10, 1000)
    .regex(TEXT_REGEX, "v.badChars")
    .refine((m) => (m.match(/\{\{[^}]*\}\}/g) ?? []).every((p) => (PROMO_PLACEHOLDERS as readonly string[]).includes(p)), "v.placeholder"),
  updatedAt: isoDate,
});
export type PromotionInput = z.infer<typeof promotionInput>;

/** Log of who a promo was opened in WhatsApp for, so a broadcast never repeats someone */
export const promoSendInput = z.object({
  id: uuid,
  promotionId: uuid,
  installerId: uuid,
  sentAt: isoDate,
  updatedAt: isoDate,
});

/** A distributor installer lists are sent to (per country) */
export const distributorInput = z
  .object({
    id: uuid,
    country,
    name: installerName,
    contactName: z
      .union([trimmed(2, 80).regex(/^[\p{L} .'\-]+$/u, "v.badChars"), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    whatsapp: optionalPhone,
    email: optionalEmail,
    notes: optionalText(500),
    updatedAt: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.whatsapp && !isValidPhone(v.whatsapp, v.country)) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "v.phoneCountry" });
    }
    if (!v.whatsapp && !v.email) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "v.contactRequired" });
    }
  });
export type DistributorInput = z.infer<typeof distributorInput>;

export const keyword = trimmed(2, 60).regex(NAME_REGEX, "v.badChars");

/** One keyword can page through results; several keywords fetch the first page of each. */
export const placesSearchInput = z
  .object({
    country,
    area: optionalArea,
    keywords: z
      .array(keyword)
      .min(1, "v.keywordsMin")
      .max(MAX_KEYWORDS_PER_SEARCH, `v.keywordsMax:${MAX_KEYWORDS_PER_SEARCH}`),
    pageToken: z.string().trim().max(1024).regex(/^[A-Za-z0-9_\-=]+$/, "v.invalid").optional(),
  })
  .refine((v) => !v.pageToken || v.keywords.length === 1, { message: "v.invalid", path: ["pageToken"] });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(60).regex(TEXT_REGEX).optional(),
  country: country.optional(),
  tier: z.enum(TIERS).optional(),
  status: z.enum(INSTALLER_STATUSES).optional(),
  source: z.enum(SOURCES).optional(),
  registeredBusiness: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  dahuaPartner: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const userInput = z.object({
  email,
  name: trimmed(2, 80).regex(/^[\p{L} .'\-]+$/u, "v.badChars"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});
