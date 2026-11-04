import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { PromoterStats } from "@/components/PromoterStats";
import { avatarColor, getPromoterList, promoterPhotoSrc } from "@/lib/promoters";

type Props = { params: Promise<{ slug: string; list: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, list } = await params;
  const l = await getPromoterList(slug, list);
  if (!l) return {};
  return {
    title: `${l.title} — ${l.promoter.name} to'plami`,
    description: l.about ?? `${l.promoter.name} (@${l.promoter.instagram}) tanlagan ${l.books.length} ta kitob va ularning narxlari.`,
    alternates: { canonical: `/targibotchilar/${slug}/${list}` },
  };
}

export default async function PromoterListPage({ params }: Props) {
  const { slug, list } = await params;
  const l = await getPromoterList(slug, list);
  if (!l) notFound();
  const p = l.promoter;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <PromoterStats id={p.id} />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/targibotchilar" className="hover:text-text">Kitob targ&apos;ibotchilari</Link> /{" "}
        <Link href={`/targibotchilar/${p.slug}`} className="hover:text-text">{p.name}</Link>
      </nav>
      <h1 className="mt-3 text-3xl sm:text-4xl">{l.title}</h1>
      <Link href={`/targibotchilar/${p.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm hover:underline">
        <PromoterAvatar name={p.name} photoUrl={promoterPhotoSrc(p)} color={avatarColor(p.name)} size={28} />
        <span className="font-semibold">{p.name}</span> <span className="text-muted">to&apos;plami · {l.books.length} ta kitob</span>
      </Link>
      {l.about && <p className="mt-4 max-w-2xl whitespace-pre-line text-muted">{l.about}</p>}
      {l.books.length ? (
        <div data-bloger-kitoblar className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {l.books.map((lb, i) => (
            <div key={lb.bookId} className="relative">
              <span className="absolute left-3 top-3 z-10 grid size-7 place-items-center rounded-full bg-bg/90 text-xs font-bold shadow">{i + 1}</span>
              <BookCard book={lb.book} />
            </div>
          ))}
        </div>
      ) : (
        <p className="card mt-6 p-6 text-center text-muted">To&apos;plam hali bo&apos;sh.</p>
      )}
    </div>
  );
}
