import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, authors] = await Promise.all([
    prisma.book.findMany({ select: { slug: true, updatedAt: true, editions: { select: { offers: { select: { updatedAt: true } } } } } }),
    prisma.author.findMany({ select: { slug: true } }),
  ]);
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/sotuvchilar"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/manzillar"), changeFrequency: "weekly", priority: 0.5 },
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
