import { BRANDS } from "../validation/rules";

type Tier = "COMMERCIAL" | "DOMESTIC" | "BOTH" | "UNKNOWN";

// English, Spanish, French and Dutch, since leads now come from across the Caribbean
const COMMERCIAL_WORDS = [
  "commercial", "industrial", "enterprise", "corporate", "project", "contractor",
  "access control", "vms", "integration", "integrator", "fire alarm", "engineering",
  "oil and gas", "warehouse", "government", "structured cabling", "turnstile", "anpr", "lpr",
  "comercial", "empresas", "industria", "proyectos", "control de acceso", "integrador", "cableado estructurado",
  "entreprise", "professionnel", "contrôle d'accès", "intégrateur", "câblage",
  "zakelijk", "bedrijven", "toegangscontrole", "projecten",
];
const DOMESTIC_WORDS = [
  "home", "residential", "homeowner", "house", "domestic", "family", "apartment",
  "gate motor", "smart home", "doorbell", "intercom",
  "hogar", "residencial", "casa", "videoportero", "portón",
  "maison", "résidentiel", "particulier", "portail", "interphone",
  "woning", "particulier", "thuis", "huis",
];

/** Brands mentioned in a block of text (word-boundary match, case-insensitive). */
export function detectBrands(text: string): string[] {
  const found = new Set<string>();
  for (const brand of BRANDS) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i");
    if (re.test(text)) found.add(brand);
  }
  return [...found];
}

/** Rough Commercial / Domestic guess from words used on the listing or website. */
export function classifyTier(text: string): Tier {
  const lower = text.toLowerCase();
  const c = COMMERCIAL_WORDS.filter((w) => lower.includes(w)).length;
  const d = DOMESTIC_WORDS.filter((w) => lower.includes(w)).length;
  if (c === 0 && d === 0) return "UNKNOWN";
  if (c > 0 && d > 0) return Math.abs(c - d) <= 1 ? "BOTH" : c > d ? "COMMERCIAL" : "DOMESTIC";
  return c > 0 ? "COMMERCIAL" : "DOMESTIC";
}
