import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { Cover } from "@/components/Cover";
import { JsonLd } from "@/components/JsonLd";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { PromoterBanner } from "@/components/PromoterBanner";
import { PromoterStats } from "@/components/PromoterStats";
import { SocialLinks } from "@/components/SocialLinks";
import { Stars } from "@/components/Stars";
import { PostCard } from "@/components/PostCard";
import { bookImage } from "@/lib/books";
import { avatarColor, getPromoter, instagramUrl, promoterBannerSrc, promoterPhotoSrc } from "@/lib/promoters";
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
  const color = avatarColor(p.name);
  const covers = p.books.map((pb) => bookImage(pb.book)?.url).filter((u): u is string => !!u);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <PromoterStats id={p.id} />
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

      <div className="mt-4">
        <PromoterBanner src={promoterBannerSrc(p)} covers={covers} color={color} />
      </div>
      <div className="relative z-10 -mt-8 flex flex-wrap items-start gap-x-4 gap-y-2 px-2 sm:-mt-14 sm:px-6">
        <span className="rounded-full bg-bg p-1">
          <PromoterAvatar name={p.name} photoUrl={promoterPhotoSrc(p)} color={color} size={88} />
        </span>
        <div className="min-w-0 flex-1 pt-10 sm:pt-16">
          <h1 className="text-2xl sm:text-4xl">{p.name}</h1>
          <p className="mt-1 text-sm">
            <a href={instagramUrl(p.instagram)} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
              @{p.instagram}
            </a>
            {p.followers && <span className="text-muted"> · {p.followers} obunachi</span>}
            <span className="text-muted"> · {p.books.length} ta tavsiya</span>
          </p>
        </div>
        <div className="pt-10 sm:pt-16">
          <SocialLinks instagram={p.instagram} telegram={p.telegram} youtube={p.youtube} />
        </div>
      </div>
      {p.about && <p className="mt-4 max-w-2xl px-2 text-muted sm:px-6">{p.about}</p>}

      {p.readingBook && (
        <Link href={`/kitob/${p.readingBook.slug}`} className="card mt-6 flex max-w-md items-center gap-4 p-3 hover:border-accent">
          <Cover title={p.readingBook.title} color={p.readingBook.coverColor} size="sm" image={bookImage(p.readingBook)?.url} className="w-14 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-accent">📖 Hozir o&apos;qiyapman</span>
            <span className="block truncate font-semibold">{p.readingBook.title}</span>
            <span className="block truncate text-sm text-muted">{p.readingBook.author.name}</span>
          </span>
        </Link>
      )}

      {p.posts.length > 0 && (
        <section className="mt-10" aria-labelledby="posts-h">
          <h2 id="posts-h" className="text-xl sm:text-2xl">Videolar va maqolalar</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.posts.map((post) => (
              <PostCard key={post.id} post={post} href={`/targibotchilar/${p.slug}/p/${post.id}`} />
            ))}
          </div>
        </section>
      )}

      {p.lists.length > 0 && (
        <section className="mt-10" aria-labelledby="lists-h">
          <h2 id="lists-h" className="text-xl sm:text-2xl">To&apos;plamlari</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.lists.map((l) => (
              <li key={l.id}>
                <Link href={`/targibotchilar/${p.slug}/${l.slug}`} className="card flex items-center gap-4 p-4 hover:border-accent">
                  <span className="flex shrink-0 -space-x-6">
                    {l.books.slice(0, 3).map((lb) => (
                      <Cover key={lb.bookId} title={lb.book.title} color="#555" size="sm" image={bookImage(lb.book)?.url} className="w-12 ring-2 ring-bg" />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{l.title}</span>
                    <span className="block text-sm text-muted">{l._count.books} ta kitob →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-10 text-xl sm:text-2xl">Tavsiya qilgan kitoblari ({p.books.length})</h2>
      {p.books.length ? (
        <div data-bloger-kitoblar className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {p.books.map((pb) => (
            <div key={pb.bookId} className="relative">
              {pb.pinned && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-contrast shadow">📌 Eng sevimli</span>
              )}
              <BookCard book={pb.book} />
              <div className="px-2.5">
                <Stars value={pb.rating} className="text-sm" />
                {pb.note && (
                  <Link href={`/kitob/${pb.book.slug}#tavsiyalar`} className="mt-0.5 block text-xs text-muted hover:text-text">
                    <span className="line-clamp-4 italic">“{pb.note}”</span>
                    {pb.note.length > 160 && <span className="mt-0.5 block font-semibold text-accent">To&apos;liq o&apos;qish →</span>}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="card mt-4 p-6 text-center text-muted">Tavsiyalar tez orada qo&apos;shiladi.</p>
      )}
    </div>
  );
}
