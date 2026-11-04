import { cache } from "react";
import type { Prisma, SellerType } from "@prisma/client";
import { prisma } from "./db";
import { searchKey } from "./normalize";
import { cached } from "./cache";
import { isUzbekEdition } from "./format";

export const bookCardInclude = {
  author: true,
  editions: { include: { offers: { select: { price: true, inStock: true, isSample: true, sellerId: true } } } },
} satisfies Prisma.BookInclude;

export type BookCardData = Prisma.BookGetPayload<{ include: typeof bookCardInclude }>;

/** Kitob uchun eng yaxshi muqova: o'z suratimiz, so'ng sotuvchi rasmi. */
export function bookImage(book: { editions: Array<{ imageUrl: string | null; imageSource: string | null }> }) {
  const own = book.editions.find((e) => e.imageUrl && e.imageSource === "own");
  const any = own ?? book.editions.find((e) => e.imageUrl);
  return any ? { url: any.imageUrl!, source: any.imageSource } : null;
}

export function priceRange(book: BookCardData) {
  // o'zbekcha nashrlar bo'lsa — faqat ular (tarjima/boshqa tildagi nashr narxni buzmasin)
  const uz = book.editions.filter((e) => isUzbekEdition(e.language));
  const every = (uz.length ? uz : book.editions).flatMap((e) => e.offers);
  // haqiqiy narxlar bo'lsa — namunaviylar hisobga olinmaydi
  const real = every.filter((o) => !o.isSample);
  const all = real.length ? real : every;
  const inStock = all.filter((o) => o.inStock);
  const pool = inStock.length ? inStock : all;
  if (!pool.length) return null;
  const prices = pool.map((o) => o.price);
  return { min: Math.min(...prices), max: Math.max(...prices), count: all.length, inStock: inStock.length };
}

/** Eng ko'p sotuvchida haqiqiy narxi bor kitoblar (solishtirish uchun eng qiziqarlilari). */
async function getMostComparedBooksRaw(limit = 12) {
  const rows = await prisma.$queryRaw<Array<{ id: string; n: bigint }>>`
    SELECT e."bookId" AS id, COUNT(DISTINCT o."sellerId") AS n
    FROM "Offer" o JOIN "Edition" e ON e.id = o."editionId"
    WHERE o."isSample" = false AND o."inStock" = true
    GROUP BY e."bookId"
    HAVING COUNT(DISTINCT o."sellerId") >= 2
    ORDER BY n DESC, MIN(o.price) ASC
    LIMIT ${limit}`;
  if (!rows.length) return [];
  const books = await prisma.book.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: bookCardInclude });
  const order = new Map(rows.map((r, i) => [r.id, i]));
  return books.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

/**
 * Bosh sahifa banneri: avval admin tanlagan kitoblar (oxirgi tanlangani birinchi),
 * kam bo'lsa — saytga eng so'nggi qo'shilgan, rasmi va haqiqiy narxi bor kitoblar.
 */
async function getBannerBooksRaw(limit = 6) {
  const featured = await prisma.book.findMany({
    where: { featuredAt: { not: null } },
    orderBy: { featuredAt: "desc" },
    take: limit,
    include: bookCardInclude,
  });
  const rest = limit - featured.length;
  const auto =
    rest > 0
      ? await prisma.book.findMany({
          where: {
            featuredAt: null,
            editions: { some: { imageUrl: { not: null }, offers: { some: { isSample: false, inStock: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: rest,
          include: bookCardInclude,
        })
      : [];
  return [...featured, ...auto].map((b) => {
    const real = b.editions.flatMap((e) => e.offers).filter((o) => !o.isSample && o.inStock);
    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author.name,
      color: b.coverColor,
      image: bookImage(b)?.url ?? null,
      note: b.featuredNote,
      minPrice: real.length ? Math.min(...real.map((o) => o.price)) : null,
      sellers: new Set(real.map((o) => o.sellerId)).size,
    };
  });
}

export type BannerBook = Awaited<ReturnType<typeof getBannerBooks>>[number];

async function catalogCountsRaw() {
  const [books, real] = await Promise.all([
    prisma.book.count(),
    prisma.offer.count({ where: { isSample: false } }),
  ]);
  return { books, realOffers: real };
}

async function getPopularBooksRaw(limit = 8) {
  return prisma.book.findMany({
    orderBy: { searchCount: "desc" },
    take: limit,
    include: bookCardInclude,
  });
}

/**
 * Qidiruv: so'rov normallashtiriladi va har bir so'z kitob nomi, kirillcha
 * nomi yoki muallif ismidan topilishi kerak.
 */
async function searchBooksRaw(query: string, limit = 30) {
  const tokens = searchKey(query).split(" ").filter(Boolean).slice(0, 8);
  if (!tokens.length) return [];

  const results = await prisma.book.findMany({
    where: { AND: tokens.map((t) => ({ searchKey: { contains: t } })) },
    include: bookCardInclude,
    take: limit,
  });

  const phrase = tokens.join(" ");
  const titleKey = (b: BookCardData) => searchKey(b.title);
  const score = (b: BookCardData) => {
    const t = titleKey(b);
    if (t === phrase) return 3;
    if (t.startsWith(phrase)) return 2;
    if (b.searchKey.includes(` ${phrase}`)) return 1;
    return 0;
  };
  return results.sort((a, b) => score(b) - score(a) || b.searchCount - a.searchCount);
}

export async function bumpSearchCount(ids: string[]) {
  if (!ids.length) return;
  await prisma.book.updateMany({ where: { id: { in: ids } }, data: { searchCount: { increment: 1 } } });
}

export const getBookBySlug = cache(cached(async (slug: string) => {
  return prisma.book.findUnique({
    where: { slug },
    include: {
      author: true,
      editions: {
        orderBy: { year: "desc" },
        include: {
          offers: {
            include: {
              seller: true,
              history: { orderBy: { recordedAt: "desc" }, take: 2, select: { price: true, recordedAt: true } },
            },
          },
        },
      },
    },
  });
}, "getBookBySlug"));

export type BookFull = NonNullable<Awaited<ReturnType<typeof getBookBySlug>>>;
export type OfferRow = BookFull["editions"][number]["offers"][number] & {
  edition: Omit<BookFull["editions"][number], "offers">;
};

export function flattenOffers(book: BookFull): OfferRow[] {
  return book.editions.flatMap(({ offers, ...edition }) => offers.map((o) => ({ ...o, edition })));
}

export type OfferSort = "arzon" | "qimmat" | "yangi";

export function filterOffers(
  offers: OfferRow[],
  opts: { types?: SellerType[]; onlyInStock?: boolean; sort?: OfferSort },
) {
  let list = offers;
  if (opts.types?.length) list = list.filter((o) => opts.types!.includes(o.seller.type));
  if (opts.onlyInStock) list = list.filter((o) => o.inStock);
  const sort = opts.sort ?? "arzon";
  return [...list].sort((a, b) => {
    // mavjud bo'lmaganlar doim oxirida
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    if (sort === "qimmat") return b.price - a.price;
    if (sort === "yangi") return b.updatedAt.getTime() - a.updatedAt.getTime();
    return a.price - b.price;
  });
}

/** Haqiqiy va namunaviy takliflarni ajratadi; asosiy ro'yxat — haqiqiylar (bo'lsa). */
export function splitOffers(all: OfferRow[]) {
  const real = all.filter((o) => !o.isSample);
  const sample = all.filter((o) => o.isSample);
  return { real, sample, primary: real.length ? real : sample, onlySample: !real.length && sample.length > 0 };
}

export function offerStats(all: OfferRow[]) {
  const primary = splitOffers(all).primary;
  const uz = primary.filter((o) => isUzbekEdition(o.edition.language));
  const offers = uz.length ? uz : primary;
  const inStock = offers.filter((o) => o.inStock);
  const pool = inStock.length ? inStock : offers;
  if (!pool.length) return null;
  const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a));
  const priciest = pool.reduce((a, b) => (b.price > a.price ? b : a));
  return {
    min: cheapest.price,
    max: priciest.price,
    cheapest,
    priciest,
    count: primary.length,
    inStockCount: primary.filter((o) => o.inStock).length,
    hasSample: primary.some((o) => o.isSample),
    lastUpdated: new Date(Math.max(...primary.map((o) => (o.checkedAt ?? o.updatedAt).getTime()))),
  };
}

export const getAuthorBySlug = cache(cached(async (slug: string) => {
  return prisma.author.findUnique({
    where: { slug },
    include: { books: { include: bookCardInclude, orderBy: { searchCount: "desc" } } },
  });
}, "getAuthorBySlug"));

async function getSellersRaw() {
  return prisma.seller.findMany({
    orderBy: [{ offers: { _count: "desc" } }, { type: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { offers: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true, status: true } },
    },
  });
}

export const getMostComparedBooks = cached(getMostComparedBooksRaw, "getMostComparedBooks", 3600);

export const getBannerBooks = cached(getBannerBooksRaw, "getBannerBooks", 3600);

export const catalogCounts = cached(catalogCountsRaw, "catalogCounts", 3600);

export const getPopularBooks = cached(getPopularBooksRaw, "getPopularBooks", 3600);

export const searchBooks = cached(searchBooksRaw, "searchBooks", 600);

export const getSellers = cached(getSellersRaw, "getSellers", 3600);
