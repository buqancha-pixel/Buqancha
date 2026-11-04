import { notFound, permanentRedirect } from "next/navigation";
import { LANGUAGE_BY_SLUG } from "@/lib/categories";

/** Eski /katalog/<til>/<mavzu> havolalari — til sahifasiga. */
export default async function OldTopicPage({ params }: { params: Promise<{ slug: string; topic: string }> }) {
  const { slug } = await params;
  if (!LANGUAGE_BY_SLUG.has(slug)) notFound();
  permanentRedirect(`/katalog/${slug}`);
}
