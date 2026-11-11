import { LANGUAGES } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/catalog";
import { getPromoters } from "@/lib/promoters";
import { getSellers } from "@/lib/books";
import { UNKNOWN_AUTHOR } from "@/lib/language";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/cache";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

// sitemap har soatda yangilanadi (har bir bot so'rovida bazaga bormaydi)
export const revalidate = 3600;

const sitemapBooks = cached(
  () => prisma.book.findMany({ select: { slug: true, updatedAt: true, editions: { select: { offers: { select: { updatedAt: true } } } } } }),
  "sitemap-books",
);
const sitemapAuthors = cached(() => prisma.author.findMany({ where: { name: { not: UNKNOWN_AUTHOR } }, select: { slug: true } }), "sitemap-authors");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, authors] = await Promise.all([sitemapBooks(), sitemapAuthors()]);
  const now = new Date();
  const [counts, promoters, sellers] = await Promise.all([getCategoryCounts(), getPromoters(), getSellers()]);
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/sotuvchilar"), changeFrequency: "weekly", priority: 0.5 },
    ...sellers.filter((s) => s._count.offers > 0).map((s) => ({ url: absoluteUrl(`/sotuvchilar/${s.slug}`), changeFrequency: "daily" as const, priority: 0.6 })),
    { url: absoluteUrl("/manzillar"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/targibotchilar"), changeFrequency: "weekly", priority: 0.5 },
    ...promoters.map((p) => ({ url: absoluteUrl(`/targibotchilar/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.4 })),
    { url: absoluteUrl("/katalog"), changeFrequency: "daily", priority: 0.8 },
    // faqat kitobi bor tillar (bo'sh sahifalar Google'ga yuborilmaydi)
    ...LANGUAGES.filter((l) => counts[l.code]).map((l) => ({ url: absoluteUrl(`/katalog/${l.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    { url: absoluteUrl("/hamkorlik"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/bot"), changeFrequency: "yearly", priority: 0.1 },
    ...books.map((b) => {
      const times = b.editions.flatMap((e) => e.offers.map((o) => o.updatedAt.getTime()));
      return {
        url: absoluteUrl(`/kitob/${b.slug}`),
        lastModified: new Date(Math.max(b.updatedAt.getTime(), ...times)),
        changeFrequency: "daily" as const,
        priority: 0.9,
      };
    }),
    ...authors.map((a) => ({ url: absoluteUrl(`/muallif/${a.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
