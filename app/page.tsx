import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { BookCard } from "@/components/BookCard";
import { Cover } from "@/components/Cover";
import { JsonLd } from "@/components/JsonLd";
import { bookImage, catalogCounts, getBannerBooks, getMostComparedBooks, getPopularBooks, getSellers } from "@/lib/books";
import { NewBooksBanner } from "@/components/NewBooksBanner";
import { LANGUAGES } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/catalog";
import { PromotersStrip } from "@/components/PromotersStrip";
import { SellerLogo } from "@/components/SellerLogo";
import { sellerPhotoSrc } from "@/lib/seller/photo";
import { formatNumber } from "@/lib/format";
import { SELLER_TYPE_LABEL } from "@/lib/format";
import { INSTAGRAM_URL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata = {
  title: { absolute: "Buqancha — kitob narxlarini solishtirish: do'kon, nashriyot, marketpleys" },
  alternates: { canonical: "/" },
};

// Koinot mavzusida suzib yuradigan muqovalar joylashuvi
const FLOAT_SLOTS = [
  "left-[2%] top-[8%] w-20 [--r:-10deg]",
  "left-[10%] bottom-[6%] w-16 [--r:8deg] [animation-delay:-3s]",
  "right-[3%] top-[12%] w-24 [--r:9deg] [animation-delay:-5s]",
  "right-[12%] bottom-[4%] w-16 [--r:-7deg] [animation-delay:-2s]",
];

export default async function HomePage() {
  const [popular, allSellers, compared, counts, banner, catCounts] = await Promise.all([
    getPopularBooks(12),
    getSellers(),
    getMostComparedBooks(12),
    catalogCounts(),
    getBannerBooks(6),
    getCategoryCounts(),
  ]);
  const langs = LANGUAGES.filter((l) => (catCounts[l.code] ?? 0) > 0);
  // faqat narxi bor sotuvchilar (katalogdagilar /sotuvchilar sahifasida)
  const sellers = allSellers.filter((s) => s._count.offers > 0);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          logo: absoluteUrl("/icon.svg"),
          sameAs: [INSTAGRAM_URL],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          inLanguage: "uz",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/qidiruv")}?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />

      <NewBooksBanner books={banner} />
      <PromotersStrip />

      <section className="relative overflow-hidden">
        <div className="float-covers pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {popular.slice(0, 4).map((b, i) => (
            <div key={b.id} className={`floating absolute opacity-80 ${FLOAT_SLOTS[i]}`}>
              <Cover title={b.title} color={b.coverColor} size="sm" image={bookImage(b)?.url} />
            </div>
          ))}
        </div>

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-14 pt-10 text-center sm:pt-16">
          <p className="mb-4 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
            {formatNumber(counts.books)} ta kitob · {sellers.length} ta sotuvchi
          </p>
          <h1 className="text-[2rem] sm:text-5xl [text-wrap:balance]">
            Kitobni eng arzon narxda toping
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg [text-wrap:pretty]">
            Kitob nomini yozing — u sotiladigan barcha joylar arzonidan qimmatiga qarab chiqadi. Lotin yoki kirillda
            yozsangiz ham bo'ladi.
          </p>
          <div className="mt-8 w-full">
            <SearchForm size="lg" />
          </div>
          <p className="mt-4 text-sm text-muted">
            Masalan:{" "}
            {["O'tkan kunlar", "Шум бола", "dunyoning ishlari"].map((q, i) => (
              <span key={q}>
                {i > 0 && ", "}
                <Link href={`/qidiruv?q=${encodeURIComponent(q)}`} className="underline decoration-dotted underline-offset-4 hover:text-text">
                  {q}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </section>

      {langs.length > 0 && (
        <section className="mx-auto mb-12 max-w-6xl px-4" aria-labelledby="cats">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 id="cats" className="text-xl sm:text-2xl">Tillar bo&apos;yicha</h2>
            <Link href="/katalog" className="text-sm font-semibold text-accent hover:underline">
              Butun katalog →
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap">
            {langs.map((c) => (
              <Link
                key={c.slug}
                href={`/katalog/${c.slug}`}
                className="shrink-0 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:border-accent"
              >
                {c.name} <span className="tabular text-muted">{formatNumber(catCounts[c.code] ?? 0)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4" aria-labelledby="popular">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="popular" className="text-xl sm:text-2xl">Ko'p qidirilgan kitoblar</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {popular.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      </section>

      {compared.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4" aria-labelledby="compared">
          <h2 id="compared" className="text-xl sm:text-2xl">Bir nechta joyda sotiladigan kitoblar</h2>
          <p className="mt-1 text-sm text-muted">Narxlari eng ko'p do'konda solishtirilgan kitoblar.</p>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {compared.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-6xl px-4" aria-labelledby="how">
        <h2 id="how" className="text-xl sm:text-2xl">Qanday ishlaydi</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Qidiring", "Kitob nomi yoki muallifni yozing: o', o‘, ö, kirill — farqi yo'q."],
            ["Solishtiring", "Do'kon, nashriyot va marketpleyslardagi narxlar arzonidan qimmatiga qarab tartiblanadi."],
            ["Sotib oling", "Ma'qul taklifni tanlang va to'g'ridan-to'g'ri sotuvchi saytiga o'ting."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="tabular font-heading text-2xl text-accent">{i + 1}</span>
              <h3 className="mt-2 text-base font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4" aria-labelledby="sellers">
        <div className="flex items-end justify-between gap-4">
          <h2 id="sellers" className="text-xl sm:text-2xl">Sotuvchilar</h2>
          <Link href="/sotuvchilar" className="text-sm font-semibold text-accent hover:underline">
            Barchasi →
          </Link>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2">
          {sellers.map((s) => (
            <li key={s.id} className={`flex items-center gap-2 rounded-full border border-border bg-surface-2 py-2 pr-4 text-sm ${s.photoAt ? "pl-2" : "pl-4"}`}>
              {s.photoAt && <SellerLogo name={s.name} src={sellerPhotoSrc(s)} size={22} />}
              <span className="font-semibold">{s.name}</span>
              <span className="text-muted"> · {SELLER_TYPE_LABEL[s.type]}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
