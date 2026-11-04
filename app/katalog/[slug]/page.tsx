import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, parseCatalogParams } from "@/components/CatalogView";
import { CATEGORY_BY_SLUG } from "@/lib/categories";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tartib?: string; sahifa?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = CATEGORY_BY_SLUG.get((await params).slug);
  if (!cat) return {};
  return {
    title: `${cat.name} — kitoblar narxi`,
    description: `${cat.about}: narxlarni do'konlar va nashriyotlar bo'yicha solishtiring.`,
    alternates: { canonical: `/katalog/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!CATEGORY_BY_SLUG.has(slug)) notFound();
  const { sort, page } = parseCatalogParams(await searchParams);
  return <CatalogView slug={slug} sort={sort} page={page} />;
}
