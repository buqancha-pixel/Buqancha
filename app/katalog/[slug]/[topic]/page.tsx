import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, parseCatalogParams } from "@/components/CatalogView";
import { CATEGORY_BY_SLUG, LANGUAGE_BY_SLUG } from "@/lib/categories";

type Props = { params: Promise<{ slug: string; topic: string }>; searchParams: Promise<{ tartib?: string; sahifa?: string }> };

/** /katalog/<til>/<mavzu> */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, topic: t } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  const topic = CATEGORY_BY_SLUG.get(t);
  if (!lang || !topic) return {};
  return {
    title: `${topic.name} — ${lang.name.toLowerCase()} kitoblar narxi`,
    description: `${lang.name}: ${topic.about.toLowerCase()}. Narxlarni do'konlar bo'yicha solishtiring.`,
    alternates: { canonical: `/katalog/${slug}/${t}` },
  };
}

export default async function LangTopicPage({ params, searchParams }: Props) {
  const { slug, topic: t } = await params;
  const lang = LANGUAGE_BY_SLUG.get(slug);
  const topic = CATEGORY_BY_SLUG.get(t);
  if (!lang || !topic) notFound();
  const { sort, page } = parseCatalogParams(await searchParams);
  return <CatalogView lang={lang} topic={topic} sort={sort} page={page} />;
}
