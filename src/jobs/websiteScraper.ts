import { lookup } from "dns/promises";
import net from "net";
import { normalizePhone } from "../validation/countries";

const MAX_BYTES = 1_500_000;
const PATHS = ["", "/contact", "/contact-us", "/contacto", "/contact-nous", "/about"];

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:127.");
}

/** Block requests to internal addresses (SSRF protection). */
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Bad protocol");
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error("Blocked host");
  return url;
}

async function fetchPage(raw: string): Promise<string | null> {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "InstallerFinderBot/1.0 (business contact lookup)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  return null;
}

export interface ScrapeResult {
  emails: string[];
  phones: string[];
  facebookUrl: string | null;
  text: string;
}

/** `country` decides which phone numbers count (area codes / number length). */
export async function scrapeWebsite(website: string, country: string): Promise<ScrapeResult> {
  const base = new URL(website);
  const emails = new Set<string>();
  const phones = new Set<string>();
  let facebookUrl: string | null = null;
  let text = "";

  for (const path of PATHS) {
    const html = await fetchPage(new URL(path || base.pathname, base.origin).toString()).catch(() => null);
    if (!html) continue;

    for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) emails.add(decodeURIComponent(m[1]).toLowerCase());
    for (const m of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) emails.add(m[0].toLowerCase());

    // Phone numbers: tel: / wa.me links first, then numbers written with + or separators
    const candidates = [
      ...[...html.matchAll(/(?:tel:|wa\.me\/|whatsapp\.com\/send\?phone=)([+\d][\d\s().-]{5,20})/gi)].map((m) => m[1]),
      ...[...html.matchAll(/(?:\+|\(|\b)\d{1,4}[\s.)-]+\d{2,4}[\s.-]+\d{2,4}(?:[\s.-]+\d{2,4})?\b/g)].map((m) => m[0]),
    ];
    for (const raw of candidates) {
      const p = normalizePhone(raw, country);
      if (p) phones.add(p);
    }

    if (!facebookUrl) {
      const fb = html.match(/https?:\/\/(?:www\.|m\.)?(?:facebook|instagram)\.com\/[A-Za-z0-9_.\-\/]+/i);
      if (fb && !/sharer|plugins|tr\?/i.test(fb[0])) facebookUrl = fb[0].slice(0, 2048);
    }
    text += " " + html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  }

  const cleanEmails = [...emails].filter(
    (e) => e.length <= 254 && !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !e.includes("example.") && !e.includes("sentry"),
  );
  return { emails: cleanEmails, phones: [...phones], facebookUrl, text: text.replace(/\s+/g, " ").slice(0, 200_000) };
}
