import type { OfferSource } from "@prisma/client";
import { prisma } from "../db";
import type { CollectedItem, RunStats } from "./types";
import { buildIndex, matchItem, type MatchIndex } from "./match";
import { decide } from "./decide";
import { normalizeIsbn } from "./isbn";

/** Ko'rinmay qolganlarni "mavjud emas" qilish chegarasi: bundan ko'p bo'lsa feed buzuq deb hisoblanadi. */
const MAX_MARK_OUT_RATIO = 0.5;

export async function loadIndex(): Promise<MatchIndex> {
  const editions = await prisma.edition.findMany({ include: { book: { include: { author: true } } } });
  return buildIndex(
    editions.map((e) => ({
      editionId: e.id,
      bookId: e.bookId,
      isbn: e.isbn,
      publisher: e.publisher,
      title: e.book.title,
      titleCyrl: e.book.titleCyrl,
      author: e.book.author.name,
      authorCyrl: e.book.author.nameCyrl,
    })),
  );
}

export type ApplyOptions = {
  source: OfferSource;
  /** feed butun katalogmi: ko'rinmagan takliflar "mavjud emas" bo'ladi */
  fullCatalog: boolean;
  /** item.key → editionId (oldindan ma'lum bog'lanishlar, masalan mahsulot havolasi) */
  knownEditions?: Map<string, string>;
  now?: Date;
};

export async function applyItems(sellerId: string, items: CollectedItem[], stats: RunStats, opts: ApplyOptions) {
  const now = opts.now ?? new Date();
  const index = await loadIndex();
  const existing = await prisma.offer.findMany({ where: { sellerId } });
  const byEdition = new Map(existing.map((o) => [o.editionId, o]));
  const byUrl = new Map(existing.filter((o) => o.url && !o.isSample).map((o) => [o.url!, o]));
  const seenEditions = new Set<string>();

  // bir nashrga bir nechta mahsulot to'g'ri kelsa — mavjud va arzonrog'i olinadi
  const sorted = [...items].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);

  for (const item of sorted) {
    stats.seen++;
    let editionId = opts.knownEditions?.get(item.key) ?? (item.url ? byUrl.get(item.url)?.editionId : undefined) ?? null;
    if (!editionId) {
      const m = matchItem(item, index);
      const isbn = normalizeIsbn(item.isbn);
      if (m.editionId) editionId = m.editionId;
      else if (m.bookId && isbn) {
        // kitob ma'lum, bu nashri esa yangi — ISBN bilan yangi nashr yaratamiz
        const ed = await prisma.edition.create({
          data: {
            bookId: m.bookId,
            isbn,
            publisher: item.publisher?.slice(0, 200) || "Noma'lum",
            pages: item.pages ?? null,
            cover: item.cover ?? null,
            year: item.year ?? null,
          },
        });
        const book = index.books.find((b) => b.bookId === m.bookId)!;
        const entry = { ...book.editions[0], editionId: ed.id, isbn, publisher: ed.publisher };
        book.editions.push(entry);
        index.byIsbn.set(isbn, entry);
        stats.newEditions++;
        editionId = ed.id;
      } else {
        stats.unmatched++;
        await recordUnmatched(sellerId, item);
        continue;
      }
    }
    if (seenEditions.has(editionId)) continue;
    seenEditions.add(editionId);

    const current = byEdition.get(editionId) ?? null;
    const d = decide(current, item);
    switch (d.action) {
      case "reject":
        stats.rejected++;
        stats.errors.push(`${item.title}: ${d.reason}`);
        break;
      case "create": {
        const offer = await prisma.offer.create({
          data: {
            editionId, sellerId, price: item.price, inStock: item.inStock, url: item.url ?? null,
            source: opts.source, isSample: false, lastSeenAt: now, checkedAt: now,
          },
        });
        await prisma.priceSnapshot.create({ data: { offerId: offer.id, price: item.price, inStock: item.inStock, recordedAt: now } });
        stats.created++;
        break;
      }
      case "flag":
        await prisma.offer.update({
          where: { id: current!.id },
          data: { pendingPrice: item.price, lastSeenAt: now, checkedAt: now },
        });
        stats.flagged++;
        stats.errors.push(`${item.title}: ${d.reason} — ko'rib chiqish kerak`);
        break;
      case "update":
        await prisma.offer.update({
          where: { id: current!.id },
          data: {
            price: item.price, inStock: item.inStock, url: item.url ?? current!.url,
            source: opts.source, isSample: false, pendingPrice: null, lastSeenAt: now, checkedAt: now,
          },
        });
        await prisma.priceSnapshot.create({ data: { offerId: current!.id, price: item.price, inStock: item.inStock, recordedAt: now } });
        stats.updated++;
        break;
      case "unchanged":
        await prisma.offer.update({
          where: { id: current!.id },
          data: { lastSeenAt: now, checkedAt: now, pendingPrice: null, url: item.url ?? current!.url },
        });
        stats.unchanged++;
        break;
    }
  }

  if (opts.fullCatalog) await markMissing(existing, seenEditions, stats, now);
}

async function markMissing(
  existing: Awaited<ReturnType<typeof prisma.offer.findMany>>,
  seen: Set<string>,
  stats: RunStats,
  now: Date,
) {
  // namunaviy narxlar: sotuvchi endi haqiqiy katalog beradi — almashtirilmagan
  // (feed'da yo'q yoki narxi rad etilgan) namunaviy takliflarning barchasi o'chiriladi
  if (stats.seen > 0 && existing.length) {
    await prisma.offer.deleteMany({ where: { sellerId: existing[0].sellerId, isSample: true } });
  }
  const missing = existing.filter((o) => !seen.has(o.editionId));
  const real = missing.filter((o) => !o.isSample && o.source !== "MANUAL" && o.inStock);
  const realTotal = existing.filter((o) => !o.isSample && o.source !== "MANUAL").length;
  if (!real.length) return;
  if (stats.seen === 0 || real.length / Math.max(realTotal, 1) > MAX_MARK_OUT_RATIO) {
    stats.errors.push(
      `${real.length} ta taklif feed'da ko'rinmadi — bu juda ko'p, feed buzuq bo'lishi mumkin. "Mavjud emas" deb belgilanmadi.`,
    );
    return;
  }
  for (const o of real) {
    await prisma.offer.update({ where: { id: o.id }, data: { inStock: false, checkedAt: now } });
    await prisma.priceSnapshot.create({ data: { offerId: o.id, price: o.price, inStock: false, recordedAt: now } });
    stats.markedOut++;
  }
}

async function recordUnmatched(sellerId: string, item: CollectedItem) {
  const data = {
    title: item.title.slice(0, 300),
    author: item.author?.slice(0, 200) ?? null,
    isbn: normalizeIsbn(item.isbn),
    price: item.price,
    inStock: item.inStock,
    url: item.url ?? null,
  };
  await prisma.unmatchedItem.upsert({
    where: { sellerId_key: { sellerId, key: item.key.slice(0, 500) } },
    create: { sellerId, key: item.key.slice(0, 500), ...data },
    // IGNORED holati saqlanib qoladi
    update: data,
  });
}
