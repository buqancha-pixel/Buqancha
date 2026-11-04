import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CATEGORIES, CATEGORY_BY_SLUG } from "./categories";
import { bookCardInclude } from "./books";

export const CATALOG_SORTS = {
  mashhur: "Mashhur",
  arzon: "Arzonroq",
  qimmat: "Qimmatroq",
  yangi: "Yangi qo'shilgan",
} as const;
export type CatalogSort = keyof typeof CATALOG_SORTS;
export const PAGE_SIZE = 36;

/** Bo'lim sharti: kitob bo'limlarida bor yoki (til bo'limi bo'lsa) shu tildagi nashri bor. */
function categoryWhere(slug: string | null): Prisma.Sql {
  if (!slug) return Prisma.sql`TRUE`;
  const cat = CATEGORY_BY_SLUG.get(slug);
  const lang = cat?.language;
  return lang
    ? Prisma.sql`(${slug} = ANY(bk."categories") OR EXISTS (SELECT 1 FROM "Edition" e2 WHERE e2."bookId" = bk.id AND e2."language" = ${lang}))`
    : Prisma.sql`${slug} = ANY(bk."categories")`;
}

/** Bo'limdagi (yoki butun katalogdagi) sotuvda bor kitoblar, saralangan va sahifalangan. */
export async function getCatalogPage(slug: string | null, sort: CatalogSort, page: number) {
  const order =
    sort === "arzon"
      ? Prisma.sql`mp ASC, ns DESC`
      : sort === "qimmat"
        ? Prisma.sql`mp DESC`
        : sort === "yangi"
          ? Prisma.sql`ca DESC`
          : Prisma.sql`sc DESC, ns DESC, mp ASC`;
  const where = categoryWhere(slug);
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT bk.id, MIN(o.price) AS mp, COUNT(DISTINCT o."sellerId") AS ns, bk."searchCount" AS sc, bk."createdAt" AS ca
      FROM "Book" bk
      JOIN "Edition" e ON e."bookId" = bk.id
      JOIN "Offer" o ON o."editionId" = e.id
      WHERE o."isSample" = false AND o."inStock" = true AND ${where}
      GROUP BY bk.id
      ORDER BY ${order}, bk.id
      LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT bk.id) AS n
      FROM "Book" bk
      JOIN "Edition" e ON e."bookId" = bk.id
      JOIN "Offer" o ON o."editionId" = e.id
      WHERE o."isSample" = false AND o."inStock" = true AND ${where}`,
  ]);
  const books = rows.length ? await prisma.book.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: bookCardInclude }) : [];
  const pos = new Map(rows.map((r, i) => [r.id, i]));
  books.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  const n = Number(total[0]?.n ?? 0);
  return { books, total: n, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)) };
}

/** Har bir bo'limdagi sotuvda bor kitoblar soni (menyu uchun; 10 daqiqa keshlanadi). */
export const getCategoryCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const rows = await prisma.$queryRaw<Array<{ c: string; n: bigint }>>`
      SELECT c, COUNT(*) AS n FROM (
        SELECT DISTINCT bk.id, unnest(bk."categories") AS c
        FROM "Book" bk JOIN "Edition" e ON e."bookId" = bk.id JOIN "Offer" o ON o."editionId" = e.id
        WHERE o."isSample" = false AND o."inStock" = true
        UNION
        SELECT DISTINCT bk.id, CASE e."language" WHEN 'ru' THEN 'rus-tilida' WHEN 'en' THEN 'ingliz-tilida' END AS c
        FROM "Book" bk JOIN "Edition" e ON e."bookId" = bk.id JOIN "Offer" o ON o."editionId" = e.id
        WHERE o."isSample" = false AND o."inStock" = true AND e."language" IN ('ru', 'en')
      ) x GROUP BY c`;
    const all = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT e."bookId") AS n FROM "Offer" o JOIN "Edition" e ON e.id = o."editionId"
      WHERE o."isSample" = false AND o."inStock" = true`;
    const out: Record<string, number> = { all: Number(all[0]?.n ?? 0) };
    for (const r of rows) out[r.c] = Number(r.n);
    return out;
  },
  ["category-counts"],
  { revalidate: 600 },
);

export function menuCategories(counts: Record<string, number>) {
  return CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, count: counts[c.slug] ?? 0 })).filter((c) => c.count > 0);
}
