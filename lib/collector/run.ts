import type { CollectorKind, Seller } from "@prisma/client";
import { prisma } from "../db";
import { applyItems } from "./apply";
import { PoliteFetcher } from "./fetcher";
import { parseFeed } from "./parsers/feed";
import { extractJsonLdItems } from "./parsers/jsonld";
import { emptyStats, type CollectedItem, type RunStats } from "./types";

export type RunResult = { seller: string; kind: CollectorKind; status: string; stats: RunStats; error?: string };

/** Hamkor feed'ini (fayl yoki matn) import qilish. */
export async function importFeed(sellerSlug: string, body: string, format?: "csv" | "json"): Promise<RunResult> {
  const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: sellerSlug } });
  return withRun(seller, "FEED", async (stats) => {
    const { items, errors } = parseFeed(body, format);
    stats.errors.push(...errors);
    await applyItems(seller.id, items, stats, { source: "PARTNER", fullCatalog: true });
  });
}

/** Sotuvchi sozlamasiga ko'ra narxlarni yig'ish. */
type FetchOpts = { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void> };

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
      await applyItems(seller.id, items, stats, { source: "PARTNER", fullCatalog: true });
    });
  }

  if (seller.collector === "PRODUCT_PAGE") {
    return withRun(seller, "PRODUCT_PAGE", async (stats) => {
      // allaqachon bog'langan mahsulot sahifalarini qayta tekshiramiz
      const offers = await prisma.offer.findMany({ where: { sellerId: seller.id, isSample: false, url: { not: null } } });
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
      await applyItems(seller.id, items, stats, { source: "AUTO", fullCatalog: false, knownEditions: known });
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
    await applyItems(seller.id, items.slice(0, 1), stats, { source: "AUTO", fullCatalog: false });
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
