/**
 * Countries covered: Caribbean islands + Guyana + Suriname.
 * The mobile app has an identical copy at mobile/src/validation/countries.ts - keep the two in step.
 *
 * Phones are stored in E.164 (+18681234567). NANP countries (+1) are checked against
 * their own area codes; others against their national number length.
 */

export type SearchLang = "en" | "es" | "fr" | "nl";

export interface Country {
  code: string; // ISO 3166-1 alpha-2 (what Google uses)
  name: { en: string; es: string; fr: string };
  dial: string; // country calling code without +
  areaCodes?: string[]; // NANP only
  lengths?: number[]; // non-NANP national number lengths
  inviteLang: "en" | "es" | "fr"; // language of the WhatsApp invite
  searchLangs: SearchLang[]; // languages used for Google search terms
  areas: string[]; // suggested towns / parishes / districts
}

export const COUNTRIES: Country[] = [
  { code: "AI", name: { en: "Anguilla", es: "Anguila", fr: "Anguilla" }, dial: "1", areaCodes: ["264"], inviteLang: "en", searchLangs: ["en"], areas: ["The Valley", "Sandy Ground", "Blowing Point", "West End"] },
  { code: "AG", name: { en: "Antigua and Barbuda", es: "Antigua y Barbuda", fr: "Antigua-et-Barbuda" }, dial: "1", areaCodes: ["268"], inviteLang: "en", searchLangs: ["en"], areas: ["St. John's", "All Saints", "English Harbour", "Barbuda"] },
  { code: "AW", name: { en: "Aruba", es: "Aruba", fr: "Aruba" }, dial: "297", lengths: [7], inviteLang: "en", searchLangs: ["nl", "en", "es"], areas: ["Oranjestad", "Noord", "San Nicolaas", "Santa Cruz", "Paradera"] },
  { code: "BS", name: { en: "Bahamas", es: "Bahamas", fr: "Bahamas" }, dial: "1", areaCodes: ["242"], inviteLang: "en", searchLangs: ["en"], areas: ["Nassau", "Freeport", "Abaco", "Eleuthera", "Exuma", "Andros"] },
  { code: "BB", name: { en: "Barbados", es: "Barbados", fr: "Barbade" }, dial: "1", areaCodes: ["246"], inviteLang: "en", searchLangs: ["en"], areas: ["St. Michael", "Christ Church", "St. James", "St. Philip", "St. George", "St. Thomas", "St. Peter", "St. Lucy", "St. John", "St. Joseph", "St. Andrew"] },
  { code: "BQ", name: { en: "Bonaire", es: "Bonaire", fr: "Bonaire" }, dial: "599", lengths: [7], inviteLang: "en", searchLangs: ["nl", "en"], areas: ["Kralendijk", "Rincon"] },
  { code: "VG", name: { en: "British Virgin Islands", es: "Islas Vírgenes Británicas", fr: "Îles Vierges britanniques" }, dial: "1", areaCodes: ["284"], inviteLang: "en", searchLangs: ["en"], areas: ["Road Town", "East End", "Virgin Gorda", "West End"] },
  { code: "KY", name: { en: "Cayman Islands", es: "Islas Caimán", fr: "Îles Caïmans" }, dial: "1", areaCodes: ["345"], inviteLang: "en", searchLangs: ["en"], areas: ["George Town", "West Bay", "Bodden Town", "East End", "Cayman Brac"] },
  { code: "CW", name: { en: "Curaçao", es: "Curazao", fr: "Curaçao" }, dial: "599", lengths: [8], inviteLang: "en", searchLangs: ["nl", "en", "es"], areas: ["Willemstad", "Punda", "Otrobanda", "Sint Michiel", "Santa Rosa"] },
  { code: "DM", name: { en: "Dominica", es: "Dominica", fr: "Dominique" }, dial: "1", areaCodes: ["767"], inviteLang: "en", searchLangs: ["en"], areas: ["Roseau", "Portsmouth", "Marigot", "Canefield"] },
  { code: "DO", name: { en: "Dominican Republic", es: "República Dominicana", fr: "République dominicaine" }, dial: "1", areaCodes: ["809", "829", "849"], inviteLang: "es", searchLangs: ["es"], areas: ["Santo Domingo", "Santiago", "Punta Cana", "La Romana", "Puerto Plata", "San Pedro de Macorís", "La Vega", "San Cristóbal"] },
  { code: "GD", name: { en: "Grenada", es: "Granada", fr: "Grenade" }, dial: "1", areaCodes: ["473"], inviteLang: "en", searchLangs: ["en"], areas: ["St. George's", "Grand Anse", "Grenville", "Gouyave", "Carriacou"] },
  { code: "GP", name: { en: "Guadeloupe", es: "Guadalupe", fr: "Guadeloupe" }, dial: "590", lengths: [9], inviteLang: "fr", searchLangs: ["fr"], areas: ["Pointe-à-Pitre", "Les Abymes", "Baie-Mahault", "Le Gosier", "Basse-Terre", "Sainte-Anne"] },
  { code: "GY", name: { en: "Guyana", es: "Guyana", fr: "Guyana" }, dial: "592", lengths: [7], inviteLang: "en", searchLangs: ["en"], areas: ["Georgetown", "East Bank Demerara", "East Coast Demerara", "West Demerara", "Linden", "New Amsterdam", "Berbice", "Essequibo Coast", "Bartica", "Lethem"] },
  { code: "HT", name: { en: "Haiti", es: "Haití", fr: "Haïti" }, dial: "509", lengths: [8], inviteLang: "fr", searchLangs: ["fr"], areas: ["Port-au-Prince", "Pétion-Ville", "Cap-Haïtien", "Les Cayes", "Gonaïves", "Jacmel"] },
  { code: "JM", name: { en: "Jamaica", es: "Jamaica", fr: "Jamaïque" }, dial: "1", areaCodes: ["876", "658"], inviteLang: "en", searchLangs: ["en"], areas: ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. Elizabeth", "Westmoreland", "Hanover", "St. James", "Trelawny", "St. Ann", "St. Mary", "Portland", "St. Thomas"] },
  { code: "MQ", name: { en: "Martinique", es: "Martinica", fr: "Martinique" }, dial: "596", lengths: [9], inviteLang: "fr", searchLangs: ["fr"], areas: ["Fort-de-France", "Le Lamentin", "Le Robert", "Schoelcher", "Ducos", "Le François"] },
  { code: "MS", name: { en: "Montserrat", es: "Montserrat", fr: "Montserrat" }, dial: "1", areaCodes: ["664"], inviteLang: "en", searchLangs: ["en"], areas: ["Brades", "Little Bay", "Salem"] },
  { code: "BL", name: { en: "Saint Barthélemy", es: "San Bartolomé", fr: "Saint-Barthélemy" }, dial: "590", lengths: [9], inviteLang: "fr", searchLangs: ["fr", "en"], areas: ["Gustavia", "Saint-Jean"] },
  { code: "KN", name: { en: "Saint Kitts and Nevis", es: "San Cristóbal y Nieves", fr: "Saint-Christophe-et-Niévès" }, dial: "1", areaCodes: ["869"], inviteLang: "en", searchLangs: ["en"], areas: ["Basseterre", "Charlestown", "Frigate Bay"] },
  { code: "LC", name: { en: "Saint Lucia", es: "Santa Lucía", fr: "Sainte-Lucie" }, dial: "1", areaCodes: ["758"], inviteLang: "en", searchLangs: ["en"], areas: ["Castries", "Gros Islet", "Vieux Fort", "Soufrière", "Micoud", "Dennery"] },
  { code: "MF", name: { en: "Saint Martin", es: "San Martín", fr: "Saint-Martin" }, dial: "590", lengths: [9], inviteLang: "fr", searchLangs: ["fr", "en"], areas: ["Marigot", "Grand Case", "Sandy Ground"] },
  { code: "VC", name: { en: "Saint Vincent and the Grenadines", es: "San Vicente y las Granadinas", fr: "Saint-Vincent-et-les-Grenadines" }, dial: "1", areaCodes: ["784"], inviteLang: "en", searchLangs: ["en"], areas: ["Kingstown", "Arnos Vale", "Calliaqua", "Georgetown", "Bequia"] },
  { code: "SX", name: { en: "Sint Maarten", es: "Sint Maarten", fr: "Saint-Martin (partie néerlandaise)" }, dial: "1", areaCodes: ["721"], inviteLang: "en", searchLangs: ["en", "nl"], areas: ["Philipsburg", "Simpson Bay", "Cole Bay", "Cul de Sac"] },
  { code: "SR", name: { en: "Suriname", es: "Surinam", fr: "Suriname" }, dial: "597", lengths: [6, 7], inviteLang: "en", searchLangs: ["nl", "en"], areas: ["Paramaribo", "Wanica", "Nickerie", "Commewijne", "Para", "Saramacca", "Marowijne", "Coronie", "Brokopondo"] },
  { code: "TT", name: { en: "Trinidad and Tobago", es: "Trinidad y Tobago", fr: "Trinité-et-Tobago" }, dial: "1", areaCodes: ["868"], inviteLang: "en", searchLangs: ["en"], areas: ["Port of Spain", "Diego Martin", "San Juan / Laventille", "Tunapuna / Piarco", "Arima", "Sangre Grande", "Chaguanas", "Couva / Tabaquite / Talparo", "San Fernando", "Princes Town", "Penal / Debe", "Siparia", "Point Fortin", "Mayaro / Rio Claro", "Tobago"] },
  { code: "TC", name: { en: "Turks and Caicos Islands", es: "Islas Turcas y Caicos", fr: "Îles Turques-et-Caïques" }, dial: "1", areaCodes: ["649"], inviteLang: "en", searchLangs: ["en"], areas: ["Providenciales", "Grand Turk", "North Caicos"] },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];
export const DEFAULT_COUNTRY = "TT";
export const countryByCode = (code: string | null | undefined) => COUNTRIES.find((c) => c.code === code);
export const countryName = (code: string | null | undefined, lang: string) => {
  const c = countryByCode(code);
  if (!c) return code ?? "";
  return c.name[(lang as "en" | "es" | "fr")] ?? c.name.en;
};

/** Search terms per language: CCTV of every type, access control, intercom, alarms, gates, Epcom… */
const SEARCH_TERMS: Record<SearchLang, string[]> = {
  en: [
    "CCTV installer",
    "IP camera installation",
    "Security camera installer",
    "Access control systems",
    "Biometric access control",
    "Video intercom installer",
    "Alarm systems",
    "Gate automation",
    "Electric fence installer",
    "Security systems integrator",
    "Fire alarm installer",
    "Structured cabling contractor",
    "Smart home installer",
    "Epcom",
  ],
  es: [
    "Instalación de cámaras de seguridad",
    "CCTV",
    "Cámaras IP",
    "Control de acceso",
    "Videoportero",
    "Alarmas de seguridad",
    "Automatización de portones",
    "Cerco eléctrico",
    "Sistemas de seguridad electrónica",
    "Cableado estructurado",
    "Epcom",
  ],
  fr: [
    "Installation vidéosurveillance",
    "Caméra de surveillance",
    "Contrôle d'accès",
    "Interphone vidéo",
    "Système d'alarme",
    "Motorisation portail",
    "Sécurité électronique",
    "Câblage réseau",
    "Epcom",
  ],
  nl: [
    "Camerabewaking",
    "Beveiligingscamera installatie",
    "Toegangscontrole",
    "Alarmsysteem",
    "Beveiligingssystemen",
    "Intercom installatie",
    "CCTV",
  ],
};

export function searchTermsFor(code: string): string[] {
  const c = countryByCode(code);
  const langs = c?.searchLangs ?? ["en"];
  return [...new Set(langs.flatMap((l) => SEARCH_TERMS[l]))];
}

/* ------------------------------ Phones ------------------------------ */

/**
 * Turn what someone typed or what Google/Meta/a website gave us into E.164 for that country.
 * Returns null if it isn't a valid number for the country.
 */
export function normalizePhone(raw: string | null | undefined, code: string): string | null {
  const c = countryByCode(code);
  if (!raw || !c) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);

  if (c.dial === "1") {
    if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
    if (d.length === 7 && c.areaCodes!.length === 1) d = c.areaCodes![0] + d;
    if (d.length !== 10 || !c.areaCodes!.includes(d.slice(0, 3))) return null;
    return `+1${d}`;
  }

  const lengths = c.lengths!;
  if (d.startsWith(c.dial) && lengths.includes(d.length - c.dial.length)) d = d.slice(c.dial.length);
  else if (d.startsWith("0") && lengths.includes(d.length - 1)) d = d.slice(1); // French-style trunk 0
  if (!lengths.includes(d.length)) return null;
  return `+${c.dial}${d}`;
}

export const isValidPhone = (e164: string, code: string) => normalizePhone(e164, code) === e164;

/** Part after the country code, as the person would write it at home */
export function nationalDigits(e164: string | null | undefined, code: string): string {
  const c = countryByCode(code);
  if (!e164 || !c) return "";
  const d = e164.replace(/\D/g, "");
  return d.startsWith(c.dial) ? d.slice(c.dial.length) : d;
}

/** +18681234567 -> 868-123-4567 ; +5971234567 -> +597 123-4567 */
export function formatPhone(e164: string | null | undefined, code: string): string {
  if (!e164) return "";
  const c = countryByCode(code);
  const n = nationalDigits(e164, code);
  if (!c) return e164;
  if (c.dial === "1") return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  if (n.length === 9) return `+${c.dial} ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`; // French style
  const cut = n.length - 4;
  return `+${c.dial} ${n.slice(0, cut)}-${n.slice(cut)}`;
}

/** As the user types the national number: digits only, grouped, capped at the country's length. */
export function formatPhoneInput(raw: string, code: string): string {
  const c = countryByCode(code);
  const max = c?.dial === "1" ? 10 : Math.max(...(c?.lengths ?? [10]));
  const d = raw.replace(/\D/g, "").slice(0, max);
  if (c?.dial === "1") {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length <= 4) return d;
  if (max === 9) return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7)].filter(Boolean).join(" ");
  return `${d.slice(0, d.length - 4)}-${d.slice(d.length - 4)}`;
}

/** Hint shown in empty phone fields, e.g. "868-123-4567" or "123-4567" */
export function phoneHint(code: string): string {
  const c = countryByCode(code);
  if (!c) return "";
  if (c.dial === "1") return `${c.areaCodes![0]}-123-4567`;
  const len = Math.max(...c.lengths!);
  if (len === 9) return "690 12 34 56";
  const sample = "123456789".slice(0, len);
  return `${sample.slice(0, len - 4)}-${sample.slice(len - 4)}`;
}
