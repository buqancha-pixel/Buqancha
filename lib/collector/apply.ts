import { languageFromSellerCategories, mapSellerCategories } from "../categories";
import type { OfferSource } from "@prisma/client";
import { prisma } from "../db";
import type { CollectedItem, RunStats } from "./types";
import { buildIndex, matchItem, type MatchIndex } from "./match";
import { decide } from "./decide";
import { normalizeIsbn } from "./isbn";
import { canCreateBook, createBookFromItem, detectLanguage } from "./create-book";
import { isReligious } from "./religion";

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
  /** bazada yo'q kitoblar uchun yangi kitob yaratilsinmi (katalog importi) */
  createBooks?: { sellerName: string; languages?: string[] };
  /** diniy adabiyot o'tkazib yuborilsin (avtomatik import qilinmaydi) */
  skipReligious?: boolean;
  /** sotuvchi slug'i — muqova rasmi manbasi sifatida yoziladi */
  sellerSlug?: string;
  now?: Date;
};

export async function applyItems(sellerId: string, items: CollectedItem[], stats: RunStats, opts: ApplyOptions) {
  const now = opts.now ?? new Date();
  // sotuvchi rasmlariga rozilik bekor qilingan bo'lsa — rasm saqlanmaydi
  const sellerRow = await prisma.seller.findUnique({ where: { id: sellerId }, select: { allowImages: true } });
  if (sellerRow && !sellerRow.allowImages) items = items.map((i) => ({ ...i, image: undefined }));
  const index = await loadIndex();
  // qo'lda kiritilgan kitoblar: diniy bo'lsa ham narxi yig'iladi
  const manualBooks = opts.skipReligious
    ? new Set((await prisma.book.findMany({ where: { origin: "manual" }, select: { id: true } })).map((b) => b.id))
    : new Set<string>();
  const existing = await prisma.offer.findMany({ where: { sellerId } });
  const byEdition = new Map(existing.map((o) => [o.editionId, o]));
  const byUrl = new Map(existing.filter((o) => o.url && !o.isSample).map((o) => [o.url!, o]));
  const seenEditions = new Set<string>();

  // bir nashrga bir nechta mahsulot to'g'ri kelsa — mavjud va arzonrog'i olinadi
  const sorted = [...items].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);

  for (const item of sorted) {
    try {
      await applyOne(item);
    } catch (e) {
      // bitta mahsulotdagi xato butun partiyani to'xtatmasin
      stats.errors.push(`${item.title}: ${(e as Error).message.split("\n").pop()}`);
    }
  }

  if (opts.fullCatalog) await markMissing(existing, seenEditions, stats, now);

  async function applyOne(raw: CollectedItem) {
    stats.seen++;
    const item: CollectedItem = { ...raw, language: detectLanguage(raw) };
    if (opts.skipReligious && isReligious(item)) {
      // diniy adabiyot avtomatik qo'shilmaydi; faqat sayt egasi qo'lda kiritgan kitobga bog'lanishi mumkin
      const m = matchItem(item, index);
      if (!m.bookId || !manualBooks.has(m.bookId)) {
        stats.religious++;
        await recordUnmatched(sellerId, item, "IGNORED");
        return;
      }
    }
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
            imageUrl: item.image ?? null,
            imageSource: item.image ? (opts.sellerSlug ?? null) : null,
            language: item.language && item.language !== "uz" ? item.language : null,
          },
        });
        const book = index.books.find((b) => b.bookId === m.bookId)!;
        const entry = { ...book.editions[0], editionId: ed.id, isbn, publisher: ed.publisher };
        book.editions.push(entry);
        index.byIsbn.set(isbn, entry);
        stats.newEditions++;
        editionId = ed.id;
      } else if (
        opts.createBooks &&
        !m.bookId &&
        "reason" in m &&
        (m.reason === "kitob topilmadi" || (m.reason.startsWith("boshqa tilda") && (opts.createBooks.languages ?? ["uz"]).includes(item.language ?? "uz")))
      ) {
        const v = canCreateBook(item, isbn, opts.createBooks.sellerName, opts.createBooks.languages);
        if (!v.ok) {
          stats.unmatched++;
          await recordUnmatched(sellerId, item);
          return;
        }
        editionId = await createBookFromItem(item, isbn!, index, opts.sellerSlug ?? "");
        stats.newBooks++;
      } else {
        stats.unmatched++;
        await recordUnmatched(sellerId, item);
        return;
      }
    }
    if (seenEditions.has(editionId)) return;
    seenEditions.add(editionId);
    if (item.image && opts.sellerSlug) await fillImage(editionId, item.image, opts.sellerSlug);
    if (item.categories?.length) await addCategories(editionId, mapSellerCategories(item.categories), languageFromSellerCategories(item.categories));

    const current = byEdition.get(editionId) ?? null;
    // hamkor o'zi kiritgan narx avtomatik yig'ish bilan almashtirilmaydi
    if (current && current.source === "PARTNER" && opts.source === "AUTO") {
      await prisma.offer.update({ where: { id: current.id }, data: { lastSeenAt: now } });
      stats.unchanged++;
      return;
    }
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

/**
 * Berilgan havolalardagi takliflarni olib tashlaydi (masalan, diniy adabiyot):
 * takliflar o'chiriladi, havolalar "e'tiborsiz" deb belgilanadi (qayta yuklanmaydi),
 * importda yaratilgan va taklifsiz qolgan nashr/kitoblar o'chiriladi. Qo'lda kiritilganlarga tegilmaydi.
 */
export async function removeOffersByUrl(sellerId: string, urls: string[]) {
  if (!urls.length) return 0;
  const offers = await prisma.offer.findMany({
    where: { sellerId, url: { in: urls } },
    include: { edition: { include: { book: true } } },
  });
  for (const o of offers) {
    await prisma.unmatchedItem.upsert({
      where: { sellerId_key: { sellerId, key: o.url! } },
      create: { sellerId, key: o.url!, title: o.edition.book.title, price: o.price, inStock: o.inStock, url: o.url, status: "IGNORED" },
      update: { status: "IGNORED" },
    });
  }
  await prisma.offer.deleteMany({ where: { id: { in: offers.map((o) => o.id) } } });
  await cleanupOrphans();
  return offers.length;
}

/** Importda yaratilgan, taklifsiz qolgan nashr va kitoblarni o'chiradi. */
export async function cleanupOrphans() {
  await prisma.edition.deleteMany({ where: { offers: { none: {} }, book: { origin: "import" } } });
  await prisma.book.deleteMany({ where: { origin: "import", editions: { none: {} } } });
  // importda yaratilgan (tavsifsiz) va kitobsiz qolgan mualliflar
  await prisma.author.deleteMany({ where: { books: { none: {} }, bio: null } });
}

/** Nashrda rasm bo'lmasa — sotuvchi rasmini yozadi (o'z suratimiz hech qachon almashtirilmaydi). */
/** Sotuvchi bo'limlaridan kelgan katalog bo'limlarini kitobga qo'shadi (bor bo'limlar saqlanadi). */
async function addCategories(editionId: string, slugs: string[], language: string | null) {
  // "rus-tilida" kabi bo'lim — nashr tili (faqat hali belgilanmagan bo'lsa)
  if (language) await prisma.edition.updateMany({ where: { id: editionId, language: null }, data: { language } });
  if (!slugs.length) return;
  const ed = await prisma.edition.findUnique({ where: { id: editionId }, select: { book: { select: { id: true, categories: true } } } });
  if (!ed) return;
  const merged = Array.from(new Set([...ed.book.categories, ...slugs]));
  if (merged.length !== ed.book.categories.length) await prisma.book.update({ where: { id: ed.book.id }, data: { categories: merged } });
}

async function fillImage(editionId: string, image: string, sellerSlug: string) {
  await prisma.edition.updateMany({ where: { id: editionId, imageUrl: null }, data: { imageUrl: image, imageSource: sellerSlug } });
}

async function recordUnmatched(sellerId: string, item: CollectedItem, status: "PENDING" | "IGNORED" = "PENDING") {
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
    create: { sellerId, key: item.key.slice(0, 500), status, ...data },
    // IGNORED holati saqlanib qoladi
    update: status === "IGNORED" ? { ...data, status } : data,
  });
}
