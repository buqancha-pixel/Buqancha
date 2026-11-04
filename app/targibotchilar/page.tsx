import type { Metadata } from "next";
import Link from "next/link";
import { Cover } from "@/components/Cover";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { bookImage } from "@/lib/books";
import { avatarColor, getPromoters, instagramUrl, promoterPhotoSrc } from "@/lib/promoters";
import { PARTNER_TELEGRAM } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kitob targ'ibotchilari — kitob blogerlari tavsiyalari",
  description: "O'zbekistondagi kitob blogerlari va targ'ibotchilari tavsiya qilgan kitoblar — narxlari do'konlar bo'yicha solishtirilgan.",
  alternates: { canonical: "/targibotchilar" },
};

export default async function PromotersPage() {
  const promoters = await getPromoters();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl sm:text-4xl">Kitob targ&apos;ibotchilari</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Kitobni sevadigan va boshqalarga sevdiradigan blogerlar. Ular tavsiya qilgan kitoblarning narxini shu yerda solishtiring.
      </p>

      {promoters.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promoters.map((p) => (
            <li key={p.id} className="card flex flex-col p-5">
              <div className="flex items-center gap-4">
                <PromoterAvatar name={p.name} photoUrl={promoterPhotoSrc(p)} color={avatarColor(p.name)} />
                <div className="min-w-0">
                  <Link href={`/targibotchilar/${p.slug}`} className="block truncate text-lg font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <a href={instagramUrl(p.instagram)} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                    @{p.instagram}
                  </a>
                  {p.followers && <span className="text-sm text-muted"> · {p.followers} obunachi</span>}
                </div>
              </div>
              {p.about && <p className="mt-3 line-clamp-3 text-sm text-muted">{p.about}</p>}
              {p.books.length > 0 && (
                <Link href={`/targibotchilar/${p.slug}`} className="mt-4 grid grid-cols-4 gap-2" aria-label={`${p.name} tavsiya qilgan kitoblar`}>
                  {p.books.map((pb) => (
                    <Cover key={pb.bookId} title={pb.book.title} color={pb.book.coverColor} size="sm" image={bookImage(pb.book)?.url} />
                  ))}
                </Link>
              )}
              <Link href={`/targibotchilar/${p.slug}`} className="mt-auto pt-4 text-sm font-semibold text-accent hover:underline">
                {p._count.books} ta tavsiya →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card mt-8 p-8 text-center text-muted">Tez orada shu yerda kitob blogerlari tavsiyalari paydo bo&apos;ladi.</p>
      )}

      <p className="mt-10 text-sm text-muted">
        Kitob blogerimisiz va shu ro&apos;yxatda bo&apos;lishni xohlaysizmi?{" "}
        <a href={`https://t.me/${PARTNER_TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
          Telegram&apos;da yozing
        </a>
        .
      </p>
    </div>
  );
}
