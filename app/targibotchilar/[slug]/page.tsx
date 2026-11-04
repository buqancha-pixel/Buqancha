import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { JsonLd } from "@/components/JsonLd";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { SocialLinks } from "@/components/SocialLinks";
import { avatarColor, getPromoter, instagramUrl, promoterPhotoSrc } from "@/lib/promoters";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPromoter((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} tavsiya qilgan kitoblar — narxlari`,
    description: `${p.name} (@${p.instagram}) tavsiya qilgan ${p.books.length} ta kitob: narxlarni do'konlar bo'yicha solishtiring.`,
    alternates: { canonical: `/targibotchilar/${p.slug}` },
  };
}

export default async function PromoterPage({ params }: Props) {
  const p = await getPromoter((await params).slug);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: p.name,
          url: absoluteUrl(`/targibotchilar/${p.slug}`),
          sameAs: [instagramUrl(p.instagram), ...(p.telegram ? [`https://t.me/${p.telegram}`] : []), ...(p.youtube ? [p.youtube] : [])],
        }}
      />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Bosh sahifa</Link> / <Link href="/targibotchilar" className="hover:text-text">Kitob targ&apos;ibotchilari</Link>
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <PromoterAvatar name={p.name} photoUrl={promoterPhotoSrc(p)} color={avatarColor(p.name)} size={88} />
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
          <p className="mt-1">
            <a href={instagramUrl(p.instagram)} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
              Instagram: @{p.instagram}
            </a>
            {p.followers && <span className="text-muted"> · {p.followers} obunachi</span>}
          </p>
          <div className="mt-3">
            <SocialLinks instagram={p.instagram} telegram={p.telegram} youtube={p.youtube} />
          </div>
        </div>
      </div>
      {p.about && <p className="mt-4 max-w-2xl text-muted">{p.about}</p>}

      <h2 className="mt-10 text-xl sm:text-2xl">Tavsiya qilgan kitoblari ({p.books.length})</h2>
      {p.books.length ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {p.books.map((pb) => (
            <div key={pb.bookId}>
              <BookCard book={pb.book} />
              {pb.note && (
                <Link href={`/kitob/${pb.book.slug}#tavsiyalar`} className="mt-1 block px-2.5 text-xs text-muted hover:text-text">
                  <span className="line-clamp-4 italic">“{pb.note}”</span>
                  {pb.note.length > 160 && <span className="mt-0.5 block font-semibold text-accent">To&apos;liq o&apos;qish →</span>}
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="card mt-4 p-6 text-center text-muted">Tavsiyalar tez orada qo&apos;shiladi.</p>
      )}
    </div>
  );
}
