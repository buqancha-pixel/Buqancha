import { cache } from "react";
import type { Prisma, SellerType } from "@prisma/client";
import { prisma } from "./db";
import { searchKey } from "./normalize";

const bookCardInclude = {
  author: true,
  editions: { include: { offers: { select: { price: true, inStock: true } } } },
} satisfies Prisma.BookInclude;

export type BookCardData = Prisma.BookGetPayload<{ include: typeof bookCardInclude }>;

export function priceRange(book: BookCardData) {
  const all = book.editions.flatMap((e) => e.offers);
  const inStock = all.filter((o) => o.inStock);
  const pool = inStock.length ? inStock : all;
  if (!pool.length) return null;
  const prices = pool.map((o) => o.price);
  return { min: Math.min(...prices), max: Math.max(...prices), count: all.length, inStock: inStock.length };
}

export async function getPopularBooks(limit = 8) {
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
export async function searchBooks(query: string, limit = 30) {
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

export const getBookBySlug = cache(async (slug: string) => {
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
});

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

export function offerStats(offers: OfferRow[]) {
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
    count: offers.length,
    inStockCount: inStock.length,
    hasSample: offers.some((o) => o.isSample),
    lastUpdated: new Date(Math.max(...offers.map((o) => (o.checkedAt ?? o.updatedAt).getTime()))),
  };
}

export const getAuthorBySlug = cache(async (slug: string) => {
  return prisma.author.findUnique({
    where: { slug },
    include: { books: { include: bookCardInclude, orderBy: { searchCount: "desc" } } },
  });
});

export async function getSellers() {
  return prisma.seller.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { offers: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true, status: true } },
    },
  });
}
