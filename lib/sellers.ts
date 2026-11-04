import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { cached } from "./cache";
import { bookCardInclude } from "./books";
import { searchKey } from "./normalize";

export const SELLER_SORTS = { mashhur: "Mashhur", arzon: "Arzonroq", qimmat: "Qimmatroq", yangi: "Yangi qo'shilgan" } as const;
export type SellerSort = keyof typeof SELLER_SORTS;
export const SELLER_PAGE_SIZE = 36;

/** Sotuvchi sahifasi (narxi bor-yo'qligidan qat'i nazar). */
export const getSellerBySlug = cached(
  (slug: string) =>
    prisma.seller.findUnique({
      where: { slug },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true } } },
    }),
  "seller-by-slug",
  3600,
);

/**
 * Sotuvchidagi kitoblar: shu sotuvchining (haqiqiy) narxi bilan, saralangan va sahifalangan.
 * Kitob ma'lumotida barcha sotuvchilarning narxlari bor — solishtirish uchun.
 */
async function getSellerBooksRaw(sellerId: string, q: string, sort: SellerSort, page: number) {
  const tokens = searchKey(q).split(" ").filter(Boolean).slice(0, 6);
  const search = tokens.length ? Prisma.join(tokens.map((t) => Prisma.sql`bk."searchKey" LIKE ${`%${t}%`}`), " AND ") : Prisma.sql`TRUE`;
  const order =
    sort === "arzon" ? Prisma.sql`mp ASC` : sort === "qimmat" ? Prisma.sql`mp DESC` : sort === "yangi" ? Prisma.sql`ca DESC` : Prisma.sql`sc DESC, mp ASC`;
  const offset = (Math.max(1, page) - 1) * SELLER_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; mp: number; ins: boolean }>>`
      SELECT bk.id, MIN(o.price) AS mp, BOOL_OR(o."inStock") AS ins, bk."searchCount" AS sc, bk."createdAt" AS ca
      FROM "Offer" o
      JOIN "Edition" e ON e.id = o."editionId"
      JOIN "Book" bk ON bk.id = e."bookId"
      WHERE o."sellerId" = ${sellerId} AND o."isSample" = false AND ${search}
      GROUP BY bk.id, bk."searchCount", bk."createdAt"
      ORDER BY BOOL_OR(o."inStock") DESC, ${order}, bk.id
      LIMIT ${SELLER_PAGE_SIZE} OFFSET ${offset}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT bk.id) AS n
      FROM "Offer" o JOIN "Edition" e ON e.id = o."editionId" JOIN "Book" bk ON bk.id = e."bookId"
      WHERE o."sellerId" = ${sellerId} AND o."isSample" = false AND ${search}`,
  ]);
  const books = rows.length ? await prisma.book.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: bookCardInclude }) : [];
  const byId = new Map(books.map((b) => [b.id, b]));
  const items = rows
    .map((r) => {
      const book = byId.get(r.id);
      if (!book) return null;
      // boshqa sotuvchilardagi mavjud haqiqiy narxlar
      const others = book.editions.flatMap((e) => e.offers).filter((o) => o.sellerId !== sellerId && !o.isSample && o.inStock);
      const otherSellers = new Set(others.map((o) => o.sellerId)).size;
      const otherMin = others.length ? Math.min(...others.map((o) => o.price)) : null;
      return { book, price: Number(r.mp), inStock: r.ins, otherSellers, otherMin, cheapest: r.ins && (otherMin === null || Number(r.mp) <= otherMin) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const n = Number(total[0]?.n ?? 0);
  return { items, total: n, pages: Math.max(1, Math.ceil(n / SELLER_PAGE_SIZE)) };
}

export const getSellerBooks = cached(getSellerBooksRaw, "seller-books", 3600);
