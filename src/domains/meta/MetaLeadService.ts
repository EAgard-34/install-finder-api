import { createHmac, randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { EnrichmentQueue } from "../../jobs/enrichQueue";
import { BRANDS, NAME_REGEX, email as emailRule } from "../../validation/rules";
import { COUNTRIES, normalizePhone } from "../../validation/countries";

type FieldData = { name: string; values: string[] }[];
type Tier = "COMMERCIAL" | "DOMESTIC" | "BOTH" | "UNKNOWN";

/**
 * Expected lead form question keys (set these as the "field ID" in Meta's form builder):
 *   full_name, phone_number, email, company_name   - standard questions
 *   business_type  - "Commercial" / "Residential" / "Both"
 *   brands_used    - multiple choice of brands
 *   country        - multiple choice of countries (names in English/Spanish/French, or ISO codes)
 *   area           - town / parish / district (short answer)
 * Anything missing is simply left blank.
 */
@injectable()
export class MetaLeadService {
  constructor(@inject(EnrichmentQueue) private enrich: EnrichmentQueue) {}

  private appSecretProof(token: string) {
    return createHmac("sha256", env.META_APP_SECRET!).update(token).digest("hex");
  }

  async fetchLead(leadgenId: string): Promise<{ field_data: FieldData; form_id?: string; created_time?: string }> {
    const token = env.META_PAGE_ACCESS_TOKEN!;
    const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${leadgenId}`);
    url.searchParams.set("fields", "field_data,form_id,created_time");
    url.searchParams.set("access_token", token);
    url.searchParams.set("appsecret_proof", this.appSecretProof(token));
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Meta lead fetch failed ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as { field_data: FieldData; form_id?: string; created_time?: string };
  }

  /** Fetch the lead from Meta and save it as an installer (or fill in an existing one). */
  async importLead(leadgenId: string) {
    const already = await prisma.installer.findUnique({ where: { fbLeadId: leadgenId } });
    if (already) return already;

    const lead = await this.fetchLead(leadgenId);
    const f = new Map(lead.field_data.map((d) => [d.name.toLowerCase(), (d.values ?? []).map((v) => String(v))]));
    const first = (key: string) => f.get(key)?.[0]?.trim() || null;

    const contactName = cleanName(first("full_name"));
    const company = cleanName(first("company_name"));
    const name = company ?? contactName ?? "Facebook lead";
    const country = toCountry(first("country")) ?? env.META_DEFAULT_COUNTRY;
    const phone = normalizePhone(first("phone_number"), country);
    const emailParsed = emailRule.safeParse(first("email") ?? "");
    const email = emailParsed.success ? emailParsed.data : null;
    const tier = toTier(f.get("business_type") ?? []);
    const brands = toBrands(f.get("brands_used") ?? []);
    const area = cleanName(first("area") ?? first("city"))?.slice(0, 60) ?? null;
    const contactNote = company && contactName ? `Contact: ${contactName}` : null;

    // Same business already in the list (by phone)? Fill in its blanks instead.
    if (phone) {
      const existing = await prisma.installer.findFirst({ where: { phone, deletedAt: null } });
      if (existing) {
        return prisma.installer.update({
          where: { id: existing.id },
          data: {
            email: existing.email ?? email,
            whatsapp: existing.whatsapp ?? phone,
            area: existing.area ?? area,
            tier: existing.tier === "UNKNOWN" ? tier : existing.tier,
            brands: [...new Set([...existing.brands, ...brands])],
            notes: mergeNotes(existing.notes, contactNote),
            updatedAt: new Date(),
          },
        });
      }
    }

    const created = await prisma.installer.create({
      data: {
        id: randomUUID(),
        country,
        name,
        phone,
        whatsapp: phone,
        email,
        area,
        tier,
        brands,
        source: "FACEBOOK_LEAD",
        fbLeadId: leadgenId,
        status: "NEW",
        notes: contactNote,
        updatedAt: new Date(),
      },
    });
    return created;
  }
}

/** Keep only characters the app's name rule allows; null if too short. */
function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = [...raw]
    .filter((ch) => NAME_REGEX.test(ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned.length >= 2 ? cleaned : null;
}

function toTier(values: string[]): Tier {
  const v = values.join(" ").toLowerCase();
  const c = /commercial|business|industrial|both/.test(v);
  const d = /residential|domestic|home|both/.test(v);
  if (c && d) return "BOTH";
  if (c) return "COMMERCIAL";
  if (d) return "DOMESTIC";
  return "UNKNOWN";
}

function toBrands(values: string[]): string[] {
  const words = values.flatMap((v) => v.split(/[,;/]/)).map((v) => v.trim().toLowerCase());
  return BRANDS.filter((b) => words.some((w) => w === b.toLowerCase() || w.includes(b.toLowerCase())));
}

/** "Jamaica", "Jamaïque", "jamaica" or "JM" -> "JM" */
function toCountry(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/_/g, " ");
  const hit = COUNTRIES.find(
    (c) => c.code.toLowerCase() === v || Object.values(c.name).some((n) => n.toLowerCase() === v),
  );
  return hit?.code ?? null;
}

function mergeNotes(existing: string | null, add: string | null): string | null {
  if (!add) return existing;
  if (existing?.includes(add)) return existing;
  return (existing ? `${existing}\n${add}` : add).slice(0, 1000);
}
