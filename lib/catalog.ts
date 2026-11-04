import { cached } from "./cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CATEGORIES, LANGUAGES } from "./categories";
import { bookCardInclude } from "./books";

export const CATALOG_SORTS = {
  mashhur: "Mashhur",
  arzon: "Arzonroq",
  qimmat: "Qimmatroq",
  yangi: "Yangi qo'shilgan",
} as const;
export type CatalogSort = keyof typeof CATALOG_SORTS;
export const PAGE_SIZE = 36;

const UZ_EDITION = Prisma.sql`(e2."language" IS NULL OR e2."language" IN ('uz', 'uz-Cyrl'))`;

/** Kitob tili: o'zbekcha nashri bo'lsa — uz; aks holda barcha nashrlari shu tilda. */
function languageWhere(code: string | null): Prisma.Sql {
  if (!code) return Prisma.sql`TRUE`;
  if (code === "uz") return Prisma.sql`EXISTS (SELECT 1 FROM "Edition" e2 WHERE e2."bookId" = bk.id AND ${UZ_EDITION})`;
  return Prisma.sql`(NOT EXISTS (SELECT 1 FROM "Edition" e2 WHERE e2."bookId" = bk.id AND ${UZ_EDITION})
    AND EXISTS (SELECT 1 FROM "Edition" e2 WHERE e2."bookId" = bk.id AND e2."language" = ${code}))`;
}

export type CatalogFilter = { language: string | null; topic: string | null };

/** Sotuvda bor kitoblar (til va mavzu bo'yicha), saralangan va sahifalangan. */
async function getCatalogPageRaw(filter: CatalogFilter, sort: CatalogSort, page: number) {
  const order =
    sort === "arzon"
      ? Prisma.sql`mp ASC, ns DESC`
      : sort === "qimmat"
        ? Prisma.sql`mp DESC`
        : sort === "yangi"
          ? Prisma.sql`ca DESC`
          : Prisma.sql`sc DESC, ns DESC, mp ASC`;
  const where = Prisma.sql`${languageWhere(filter.language)} AND ${filter.topic ? Prisma.sql`${filter.topic} = ANY(bk."categories")` : Prisma.sql`TRUE`}`;
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

/**
 * Sotuvda bor kitoblar soni: kalitlar "all", "<til>", "<til>|<mavzu>", "*|<mavzu>" (10 daqiqa keshlanadi).
 */
export const getCategoryCounts = cached(
  async (): Promise<Record<string, number>> => {
    const rows = await prisma.$queryRaw<Array<{ lang: string; topic: string | null; n: bigint }>>`
      WITH b AS (
        SELECT DISTINCT bk.id, bk."categories",
          CASE
            WHEN EXISTS (SELECT 1 FROM "Edition" e2 WHERE e2."bookId" = bk.id AND ${UZ_EDITION}) THEN 'uz'
            ELSE (SELECT MIN(e2."language") FROM "Edition" e2 WHERE e2."bookId" = bk.id)
          END AS lang
        FROM "Book" bk JOIN "Edition" e ON e."bookId" = bk.id JOIN "Offer" o ON o."editionId" = e.id
        WHERE o."isSample" = false AND o."inStock" = true
      )
      SELECT lang, NULL AS topic, COUNT(*) AS n FROM b GROUP BY lang
      UNION ALL
      SELECT lang, t AS topic, COUNT(*) AS n FROM b, unnest(b."categories") AS t GROUP BY lang, t`;
    const out: Record<string, number> = { all: 0 };
    for (const r of rows) {
      const n = Number(r.n);
      if (r.topic === null) {
        out[r.lang] = (out[r.lang] ?? 0) + n;
        out.all += n;
      } else {
        out[`${r.lang}|${r.topic}`] = n;
        out[`*|${r.topic}`] = (out[`*|${r.topic}`] ?? 0) + n;
      }
    }
    return out;
  },
  "category-counts-v2",
  3600,
);

export type MenuLanguage = { slug: string; name: string; count: number; topics: Array<{ slug: string; name: string; count: number }> };

/** Menyu: tillar va ularning ichidagi mavzular (bo'sh bo'limlar ko'rsatilmaydi). */
export function menuTree(counts: Record<string, number>): MenuLanguage[] {
  return LANGUAGES.map((l) => ({
    slug: l.slug,
    name: l.name,
    count: counts[l.code] ?? 0,
    topics: CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, count: counts[`${l.code}|${c.slug}`] ?? 0 })).filter((c) => c.count > 0),
  })).filter((l) => l.count > 0);
}

/** Barcha tillardagi mavzular (bosh sahifa qatori uchun). */
export function menuCategories(counts: Record<string, number>) {
  return CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, count: counts[`*|${c.slug}`] ?? 0 })).filter((c) => c.count > 0);
}

export const getCatalogPage = cached(getCatalogPageRaw, "getCatalogPage", 3600);
