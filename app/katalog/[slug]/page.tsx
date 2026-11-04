import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, parseCatalogParams } from "@/components/CatalogView";
import { CATEGORY_BY_SLUG, LANGUAGE_BY_SLUG } from "@/lib/categories";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tartib?: string; sahifa?: string }> };

/** /katalog/<til> yoki /katalog/<mavzu> (barcha tillarda) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  if (lang) return { title: `${lang.name} kitoblar — narxlar`, description: `${lang.about}: narxlarni do'konlar bo'yicha solishtiring.`, alternates: { canonical: `/katalog/${slug}` } };
  const topic = CATEGORY_BY_SLUG.get(slug);
  if (topic) return { title: `${topic.name} — kitoblar narxi`, description: `${topic.about}: narxlarni do'konlar va nashriyotlar bo'yicha solishtiring.`, alternates: { canonical: `/katalog/${slug}` } };
  return {};
}

export default async function SlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  const topic = CATEGORY_BY_SLUG.get(slug);
  if (!lang && !topic) notFound();
  const { sort, page } = parseCatalogParams(await searchParams);
  return <CatalogView lang={lang} topic={topic} sort={sort} page={page} />;
}
