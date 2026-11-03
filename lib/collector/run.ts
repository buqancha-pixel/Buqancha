import type { CollectorKind, Seller } from "@prisma/client";
import { prisma } from "../db";
import { applyItems } from "./apply";
import { PoliteFetcher } from "./fetcher";
import { parseFeed } from "./parsers/feed";
import { extractJsonLdItems } from "./parsers/jsonld";
import { emptyStats, type CollectedItem, type RunStats } from "./types";
import { loadIndex } from "./apply";
import { searchKey } from "../normalize";

export type RunResult = { seller: string; kind: CollectorKind; status: string; stats: RunStats; error?: string };

/** Hamkor feed'ini (fayl yoki matn) import qilish. */
export async function importFeed(sellerSlug: string, body: string, format?: "csv" | "json"): Promise<RunResult> {
  const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: sellerSlug } });
  return withRun(seller, "FEED", async (stats) => {
    const { items, errors } = parseFeed(body, format);
    stats.errors.push(...errors);
    await applyItems(seller.id, items, stats, { source: "PARTNER", fullCatalog: true, sellerSlug: seller.slug });
  });
}

/** Sotuvchi sozlamasiga ko'ra narxlarni yig'ish. */
type FetchOpts = { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; discoverLimit?: number };

/** Sitemap'dan barcha <loc> manzillarni oladi (sitemapindex bo'lsa — ichki sitemap'lar ham, 20 tagacha). */
export async function sitemapLocs(fetcher: PoliteFetcher, url: string, depth = 0): Promise<string[]> {
  const res = await fetcher.get(url);
  if (res.status !== 200) throw new Error(`sitemap HTTP ${res.status}: ${url}`);
  const locs = Array.from(res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g), (m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  if (/<sitemapindex/i.test(res.body) && depth < 1) {
    const out: string[] = [];
    for (const child of locs.slice(0, 20)) out.push(...(await sitemapLocs(fetcher, child, depth + 1)));
    return out;
  }
  return locs;
}

/** URL'ning oxirgi qismini qidiruv kalitiga aylantiradi: "/kitob/otkan-kunlar-romoni" → "otkan kunlar romoni" */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    return searchKey(last.replace(/[-_]+/g, " "));
  } catch {
    return "";
  }
}

/**
 * Sitemap orqali bazadagi kitoblarga mos mahsulot sahifalarini topish.
 * Faqat manzilida kitob nomi uchraydigan, avval ko'rilmagan sahifalar yuklanadi.
 */
async function discover(seller: Seller, fetcher: PoliteFetcher, stats: RunStats, limit: number) {
  const index = await loadIndex();
  const titleKeys = Array.from(new Set(index.books.flatMap((b) => b.titleKeys))).filter((k) => k.length >= 3);
  const [offers, unmatched] = await Promise.all([
    prisma.offer.findMany({ where: { sellerId: seller.id, url: { not: null } }, select: { url: true } }),
    prisma.unmatchedItem.findMany({ where: { sellerId: seller.id }, select: { key: true } }),
  ]);
  const known = new Set([...offers.map((o) => o.url!), ...unmatched.map((u) => u.key)]);

  const locs: string[] = [];
  for (const sm of seller.sitemapUrls) {
    try {
      locs.push(...(await sitemapLocs(fetcher, sm)));
    } catch (e) {
      stats.errors.push(`${sm}: ${(e as Error).message}`);
    }
  }
  const candidates = Array.from(new Set(locs)).filter((url) => {
    if (known.has(url)) return false;
    const k = ` ${urlKey(url)} `;
    return titleKeys.some((t) => k.includes(` ${t} `));
  });
  if (candidates.length > limit) stats.errors.push(`${candidates.length} ta nomzoddan ${limit} tasi tekshirildi`);

  const items: CollectedItem[] = [];
  for (const url of candidates.slice(0, limit)) {
    try {
      const res = await fetcher.get(url);
      if (res.status !== 200) continue;
      const found = extractJsonLdItems(res.body, url);
      if (found[0]) items.push({ ...found[0], key: url, url });
    } catch (e) {
      stats.errors.push(`${url}: ${(e as Error).message}`);
    }
  }
  await applyItems(seller.id, items, stats, { source: "AUTO", fullCatalog: false, sellerSlug: seller.slug });
}

export async function collectSeller(sellerSlug: string, opts: FetchOpts = {}): Promise<RunResult> {
  const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: sellerSlug } });
  const fetcher = new PoliteFetcher({ minDelayMs: seller.crawlDelayMs, ...opts });

  if (seller.collector === "FEED") {
    if (!seller.feedUrl) throw new Error(`${seller.name}: feedUrl ko'rsatilmagan`);
    return withRun(seller, "FEED", async (stats) => {
      const res = await fetcher.get(seller.feedUrl!);
      if (res.status !== 200) throw new Error(`feed HTTP ${res.status}`);
      const fmt = res.contentType.includes("json") ? "json" : res.contentType.includes("csv") ? "csv" : undefined;
      const { items, errors } = parseFeed(res.body, fmt);
      stats.errors.push(...errors);
      await applyItems(seller.id, items, stats, { source: "PARTNER", fullCatalog: true, sellerSlug: seller.slug });
    });
  }

  if (seller.collector === "PRODUCT_PAGE") {
    return withRun(seller, "PRODUCT_PAGE", async (stats) => {
      const started = new Date();
      if (seller.sitemapUrls.length) await discover(seller, fetcher, stats, opts.discoverLimit ?? 200);
      // allaqachon bog'langan mahsulot sahifalarini qayta tekshiramiz
      // (shu ishga tushirishda topilganlar qayta yuklanmaydi)
      const offers = await prisma.offer.findMany({
        where: {
          sellerId: seller.id,
          isSample: false,
          url: { not: null },
          OR: [{ checkedAt: null }, { checkedAt: { lt: started } }],
        },
      });
      const items: CollectedItem[] = [];
      const known = new Map<string, string>();
      for (const o of offers) {
        try {
          const res = await fetcher.get(o.url!);
          if (res.status === 404 || res.status === 410) {
            items.push({ key: o.url!, title: "", price: o.price, inStock: false, url: o.url! });
            known.set(o.url!, o.editionId);
            continue;
          }
          const found = extractJsonLdItems(res.body, o.url!);
          if (!found.length) {
            stats.errors.push(`${o.url}: sahifada JSON-LD narx topilmadi`);
            continue;
          }
          const item = { ...found[0], key: o.url!, url: o.url! };
          items.push(item);
          known.set(item.key, o.editionId);
        } catch (e) {
          stats.errors.push(`${o.url}: ${(e as Error).message}`);
        }
      }
      await applyItems(seller.id, items, stats, { source: "AUTO", fullCatalog: false, knownEditions: known, sellerSlug: seller.slug });
    });
  }

  return { seller: seller.slug, kind: seller.collector, status: "SKIPPED", stats: emptyStats() };
}

/** Bitta mahsulot sahifasini qo'shish (keyin collectSeller uni muntazam tekshiradi). */
export async function trackProductUrl(sellerSlug: string, url: string, opts: FetchOpts = {}): Promise<RunResult> {
  const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: sellerSlug } });
  const fetcher = new PoliteFetcher({ minDelayMs: seller.crawlDelayMs, ...opts });
  if (seller.website && new URL(url).host.replace(/^www\./, "") !== new URL(seller.website).host.replace(/^www\./, "")) {
    throw new Error(`Havola ${seller.name} saytiga tegishli emas: ${url}`);
  }
  return withRun(seller, "PRODUCT_PAGE", async (stats) => {
    const res = await fetcher.get(url);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const items = extractJsonLdItems(res.body, url).map((i) => ({ ...i, key: url, url }));
    if (!items.length) throw new Error("Sahifada schema.org Product/Offer topilmadi");
    await applyItems(seller.id, items.slice(0, 1), stats, { source: "AUTO", fullCatalog: false, sellerSlug: seller.slug });
  });
}

async function withRun(seller: Seller, kind: CollectorKind, work: (stats: RunStats) => Promise<void>): Promise<RunResult> {
  const stats = emptyStats();
  const run = await prisma.collectorRun.create({ data: { sellerId: seller.id, kind } });
  let status: "SUCCESS" | "PARTIAL" | "FAILED" = "SUCCESS";
  let error: string | undefined;
  try {
    await work(stats);
    if (stats.errors.length) status = "PARTIAL";
  } catch (e) {
    status = "FAILED";
    error = (e as Error).message;
  }
  await prisma.collectorRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      error: error ?? null,
      stats: { ...stats, errors: stats.errors.slice(0, 200) },
    },
  });
  return { seller: seller.slug, kind, status, stats, error };
}

export async function collectAll(opts: FetchOpts = {}): Promise<RunResult[]> {
  const sellers = await prisma.seller.findMany({ where: { collector: { not: "NONE" } } });
  const results: RunResult[] = [];
  for (const s of sellers) {
    try {
      results.push(await collectSeller(s.slug, opts));
    } catch (e) {
      results.push({ seller: s.slug, kind: s.collector, status: "FAILED", stats: emptyStats(), error: (e as Error).message });
    }
  }
  return results;
}
