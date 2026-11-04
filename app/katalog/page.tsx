import type { Metadata } from "next";
import { CatalogView, parseCatalogParams } from "@/components/CatalogView";

export const metadata: Metadata = {
  title: "Kitoblar katalogi — narxlarni solishtirish",
  description: "O'zbekistondagi kitob do'konlari va nashriyotlarda sotuvda bor kitoblar katalogi: o'zbek, rus va ingliz tilidagi kitoblar, narxlar va do'konlar.",
  alternates: { canonical: "/katalog" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ tartib?: string; sahifa?: string }> }) {
  const { sort, page } = parseCatalogParams(await searchParams);
  return <CatalogView sort={sort} page={page} />;
}
