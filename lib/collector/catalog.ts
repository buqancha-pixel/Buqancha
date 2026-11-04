import { prisma } from "../db";
import { applyItems } from "./apply";
import { PoliteFetcher, type FetcherOptions } from "./fetcher";
import { extractJsonLdItems } from "./parsers/jsonld";
import { extractCategories } from "./religion";
import { catalogLocs } from "./run";
import { emptyStats, type CollectedItem, type RunStats } from "./types";

export type CatalogOptions = Pick<FetcherOptions, "fetchImpl" | "sleep"> & {
  /** shu ishga tushirishda ko'pi bilan nechta sahifa yuklansin */
  limit?: number;
  batchSize?: number;
  /** navbatdagi (PENDING) moslanmaganlarni ham qayta ko'rib chiqish — qoidalar yaxshilangandan keyin */
  retryPending?: boolean;
  onBatch?: (done: number, total: number, stats: RunStats) => void;
};

/**
 * Katalog importi: sotuvchining sitemap'idagi barcha kitob sahifalarini yuklab,
 * bazada yo'q kitoblarni yaratadi (ISBN va muallif bo'lsa) va narxlarni yozadi.
 * Davom ettirish mumkin: avval ko'rilgan sahifalar (taklif yoki navbatdagi mahsulot) o'tkazib yuboriladi.
 */
export async function importCatalog(sellerSlug: string, opts: CatalogOptions = {}) {
  const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: sellerSlug } });
  if ((!seller.sitemapUrls.length && !seller.listingUrls.length) || !seller.productUrlPattern)
    throw new Error(`${seller.name}: sitemapUrls/listingUrls va productUrlPattern sozlanmagan`);
  const fetcher = new PoliteFetcher({ minDelayMs: seller.crawlDelayMs, fetchImpl: opts.fetchImpl, sleep: opts.sleep });
  const pattern = new RegExp(seller.productUrlPattern);
  const stats = emptyStats();
  const run = await prisma.collectorRun.create({ data: { sellerId: seller.id, kind: "PRODUCT_PAGE" } });
  let error: string | undefined;

  try {
    const locs = await catalogLocs(seller, fetcher, stats.errors);
    if (!locs.length && stats.errors.length) throw new Error(stats.errors[0]);
    const [offers, unmatched] = await Promise.all([
      prisma.offer.findMany({ where: { sellerId: seller.id, url: { not: null } }, select: { url: true } }),
      prisma.unmatchedItem.findMany({
        // qayta ko'rishda: faqat ISBN va muallifi bor PENDING'lar (qolganlaridan baribir kitob yaratilmaydi)
        where: {
          sellerId: seller.id,
          ...(opts.retryPending ? { NOT: { status: "PENDING", isbn: { not: null }, author: { not: null } } } : {}),
        },
        select: { key: true },
      }),
    ]);
    const known = new Set([...offers.map((o) => o.url!), ...unmatched.map((u) => u.key)]);
    const todo = Array.from(new Set(locs)).filter((u) => pattern.test(u) && !known.has(u));
    const queue = todo.slice(0, opts.limit ?? todo.length);
    const batchSize = opts.batchSize ?? 25;

    for (let i = 0; i < queue.length; i += batchSize) {
      const items: CollectedItem[] = [];
      for (const url of queue.slice(i, i + batchSize)) {
        try {
          const res = await fetcher.get(url);
          if (res.status !== 200) continue;
          const found = extractJsonLdItems(res.body, url);
          if (found[0]) items.push({ ...found[0], key: url, url, categories: extractCategories(res.body) });
        } catch (e) {
          if (stats.errors.length < 200) stats.errors.push(`${url}: ${(e as Error).message}`);
        }
      }
      await applyItems(seller.id, items, stats, {
        source: "AUTO",
        fullCatalog: false,
        createBooks: { sellerName: seller.name, languages: seller.importLanguages },
        skipReligious: true,
        sellerSlug: seller.slug,
      });
      await prisma.collectorRun.update({ where: { id: run.id }, data: { stats: { ...stats, errors: stats.errors.slice(0, 50) } } });
      opts.onBatch?.(Math.min(i + batchSize, queue.length), queue.length, stats);
    }
  } catch (e) {
    error = (e as Error).message;
  }

  const status = error ? "FAILED" : stats.errors.length ? "PARTIAL" : "SUCCESS";
  await prisma.collectorRun.update({
    where: { id: run.id },
    data: { status, finishedAt: new Date(), error: error ?? null, stats: { ...stats, errors: stats.errors.slice(0, 200) } },
  });
  return { seller: seller.slug, status, stats, error };
}
