import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CatalogView, parseCatalogParams } from "@/components/CatalogView";
import { CATEGORY_BY_SLUG, LANGUAGE_BY_SLUG } from "@/lib/categories";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tartib?: string; sahifa?: string }> };

/** /katalog/<til>: o'zbek, rus yoki ingliz tilidagi kitoblar */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  if (!lang) return {};
  return { title: `${lang.name} kitoblar — narxlar`, description: `${lang.about}: narxlarni do'konlar bo'yicha solishtiring.`, alternates: { canonical: `/katalog/${slug}` } };
}

export default async function LanguagePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  // eski mavzu sahifalari (/katalog/bolalar va h.k.) — umumiy katalogga
  if (!lang && CATEGORY_BY_SLUG.has(slug)) permanentRedirect("/katalog");
  if (!lang) notFound();
  const { sort, page } = parseCatalogParams(await searchParams);
  return <CatalogView lang={lang} sort={sort} page={page} />;
}
