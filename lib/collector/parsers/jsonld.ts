import type { CollectedItem } from "../types.ts";
import { parsePrice } from "../price.ts";
import { normalizeIsbn } from "../isbn.ts";

/**
 * HTML ichidagi schema.org JSON-LD'dan Product/Book va ularning Offer'larini
 * ajratib oladi. Ko'p do'konlar (Google uchun) narxni shu formatda beradi,
 * shuning uchun bu sayt-mustaqil umumiy parser.
 */
export function extractJsonLdItems(html: string, pageUrl: string): CollectedItem[] {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    (m) => m[1],
  );
  const nodes: Record<string, unknown>[] = [];
  for (const raw of blocks) {
    try {
      collect(JSON.parse(decodeEntities(raw.trim())), nodes);
    } catch {
      // buzuq JSON-LD — o'tkazib yuboramiz
    }
  }

  const items: CollectedItem[] = [];
  for (const node of nodes) {
    if (!hasType(node, ["Product", "Book", "IndividualProduct"])) continue;
    const title = text(node.name);
    if (!title) continue;
    const offer = pickOffer(node.offers);
    if (!offer) continue;
    const price = parsePrice(offer.price ?? offer.lowPrice);
    const currency = text(offer.priceCurrency)?.toUpperCase();
    if (!price || (currency && currency !== "UZS" && currency !== "SUM" && currency !== "SO'M")) continue;
    const url = absolutize(text(offer.url) ?? text(node.url) ?? pageUrl, pageUrl);
    const isbn =
      normalizeIsbn(text(node.isbn)) ??
      normalizeIsbn(text(node.gtin13)) ??
      normalizeIsbn(text(node.gtin)) ??
      normalizeIsbn(text((node.workExample as Record<string, unknown> | undefined)?.isbn)) ??
      undefined;
    items.push({
      key: url,
      title,
      author: personName(node.author) ?? personName(node.brand),
      publisher: personName(node.publisher),
      isbn,
      price,
      inStock: availability(offer.availability),
      url,
      pages: positiveInt(node.numberOfPages),
      cover: coverType(node.bookFormat) ?? coverFromTitle(title),
      year: yearOf(node.datePublished),
      language: text(node.inLanguage)?.toLowerCase().slice(0, 2),
    });
  }
  return items;
}

function collect(value: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(value)) return value.forEach((v) => collect(v, out));
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (obj["@graph"]) collect(obj["@graph"], out);
  if (obj["@type"]) out.push(obj);
  if (obj.mainEntity) collect(obj.mainEntity, out);
}

function hasType(node: Record<string, unknown>, types: string[]): boolean {
  const t = node["@type"];
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => typeof x === "string" && types.includes(x.replace(/^https?:\/\/schema\.org\//, "")));
}

function pickOffer(offers: unknown): Record<string, unknown> | null {
  const list = (Array.isArray(offers) ? offers : offers ? [offers] : []) as Record<string, unknown>[];
  const flat = list.flatMap((o) =>
    hasType(o, ["AggregateOffer"]) && o.offers ? (Array.isArray(o.offers) ? o.offers : [o.offers]) : [o],
  ) as Record<string, unknown>[];
  if (!flat.length) return null;
  // eng arzon mavjud taklifni tanlaymiz
  const priced = flat
    .map((o) => ({ o, p: parsePrice(o.price ?? o.lowPrice) }))
    .filter((x) => x.p)
    .sort((a, b) => Number(availability(b.o.availability)) - Number(availability(a.o.availability)) || a.p! - b.p!);
  return priced[0]?.o ?? null;
}

function availability(v: unknown): boolean {
  const s = text(v);
  if (!s) return true;
  return /InStock|LimitedAvailability|OnlineOnly|InStoreOnly|PreSale|PreOrder/i.test(s);
}

function personName(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) return v.map(personName).filter(Boolean).join(", ") || undefined;
  if (typeof v === "object") return text((v as Record<string, unknown>).name);
  return undefined;
}

function text(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  return undefined;
}

function positiveInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 && n < 10000 ? n : undefined;
}

function coverType(v: unknown): "qattiq" | "yumshoq" | undefined {
  const s = text(v);
  if (!s) return undefined;
  if (/Hardcover/i.test(s)) return "qattiq";
  if (/Paperback/i.test(s)) return "yumshoq";
  return undefined;
}

/** "O'tkan kunlar (А5, qattiq)" → "qattiq" */
function coverFromTitle(title: string): "qattiq" | "yumshoq" | undefined {
  if (/\bqattiq\b/i.test(title)) return "qattiq";
  if (/\byumshoq\b/i.test(title)) return "yumshoq";
  return undefined;
}

function yearOf(v: unknown): number | undefined {
  const m = text(v)?.match(/\b(1[89]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : undefined;
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return base;
  }
}

function decodeEntities(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
}
