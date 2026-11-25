import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import type { Installer } from "@prisma/client";
import type { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/errors";
import { classifyTier, detectBrands } from "../../lib/classify";
import { EnrichmentQueue } from "../../jobs/enrichQueue";
import { countryByCode, normalizePhone } from "../../validation/countries";
import type { placesSearchInput } from "../../validation/rules";

interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
}

type SearchInput = z.infer<typeof placesSearchInput>;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "nextPageToken",
].join(",");

const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com)$/i;

@injectable()
export class PlacesService {
  constructor(@inject(EnrichmentQueue) private queue: EnrichmentQueue) {}

  /**
   * Google Places (New) Text Search for one country. Several keywords can run in one go
   * (first page of each; each keyword is one paid Google request). Results outside the
   * chosen country are dropped. New places become leads; known ones are left as they are.
   */
  async search(input: SearchInput, userId: string) {
    const country = countryByCode(input.country)!;
    const where = input.area ? `${input.area}, ${country.name.en}` : country.name.en;

    const byId = new Map<string, { installer: Installer; isNew: boolean }>();
    let nextPageToken: string | null = null;

    for (const keyword of input.keywords) {
      const body = await this.textSearch(`${keyword} in ${where}`, country.code, input.pageToken);
      if (input.keywords.length === 1) nextPageToken = body.nextPageToken ?? null;
      for (const p of body.places ?? []) {
        if (!this.inCountry(p, country.code)) continue;
        const r = await this.upsertFromPlace(p, country.code, input.area ?? null, userId);
        const prev = byId.get(r.installer.id);
        byId.set(r.installer.id, { installer: r.installer, isNew: (prev?.isNew ?? false) || r.isNew });
      }
    }

    const results = [...byId.values()];
    return {
      installers: results.map((r) => ({ ...r.installer, isNew: r.isNew })),
      newCount: results.filter((r) => r.isNew).length,
      nextPageToken,
    };
  }

  private async textSearch(textQuery: string, regionCode: string, pageToken?: string) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, regionCode, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("Places error", res.status, await res.text().catch(() => ""));
      throw new HttpError(502, "Google search failed, try again shortly");
    }
    return (await res.json()) as { places?: PlaceResult[]; nextPageToken?: string };
  }

  private inCountry(p: PlaceResult, code: string) {
    const c = p.addressComponents?.find((a) => a.types?.includes("country"));
    return c?.shortText?.toUpperCase() === code;
  }

  private async upsertFromPlace(p: PlaceResult, country: string, area: string | null, userId: string) {
    const existing = await prisma.installer.findUnique({ where: { googlePlaceId: p.id } });
    if (existing) return { installer: existing, isNew: false };

    const name = (p.displayName?.text ?? "Unnamed business").slice(0, 120);
    const phone = normalizePhone(p.internationalPhoneNumber ?? p.nationalPhoneNumber, country);

    // Same business already added by hand or from Facebook? Link it instead of duplicating.
    if (phone) {
      const samePhone = await prisma.installer.findFirst({ where: { phone, googlePlaceId: null, deletedAt: null } });
      if (samePhone) {
        const linked = await prisma.installer.update({
          where: { id: samePhone.id },
          data: { googlePlaceId: p.id, address: samePhone.address ?? p.formattedAddress?.slice(0, 250) },
        });
        return { installer: linked, isNew: false };
      }
    }

    let website: string | null = null;
    let facebookUrl: string | null = null;
    if (p.websiteUri) {
      try {
        const host = new URL(p.websiteUri).hostname.replace(/^www\./, "");
        if (SOCIAL.test(host)) facebookUrl = p.websiteUri.slice(0, 2048);
        else website = p.websiteUri.slice(0, 2048);
      } catch {
        /* ignore bad URLs */
      }
    }

    const locality = p.addressComponents?.find((a) => a.types?.includes("locality"))?.longText?.slice(0, 60) ?? null;
    const text = `${name} ${(p.types ?? []).join(" ")}`;
    const installer = await prisma.installer.create({
      data: {
        id: randomUUID(),
        country,
        name,
        phone,
        whatsapp: phone,
        website,
        facebookUrl,
        address: p.formattedAddress?.slice(0, 250) ?? null,
        area: area ?? locality,
        tier: classifyTier(text),
        brands: detectBrands(text),
        source: "GOOGLE_PLACES",
        googlePlaceId: p.id,
        createdById: userId,
        updatedAt: new Date(),
        enrichmentStatus: website ? "PENDING" : "NONE",
      },
    });
    if (website) await this.queue.add(installer.id);
    return { installer, isNew: true };
  }
}
