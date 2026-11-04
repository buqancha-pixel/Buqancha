import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SellerType } from "@prisma/client";
import { Cover } from "@/components/Cover";
import { BookCard } from "@/components/BookCard";
import { JsonLd } from "@/components/JsonLd";
import { SampleNotice } from "@/components/SampleNotice";
import {
  filterOffers,
  flattenOffers,
  getAuthorBySlug,
  bookImage,
  getBookBySlug,
  offerStats,
  splitOffers,
  type OfferRow,
  type OfferSort,
} from "@/lib/books";
import {
  SELLER_TYPE_LABEL,
  SELLER_TYPE_PARAM,
  SELLER_TYPE_PLURAL,
  SOURCE_LABEL,
  formatDate,
  formatNumber,
  formatPrice,
  formatRelative,
  LANGUAGE_LABEL,
} from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Kitob topilmadi" };
  const stats = offerStats(flattenOffers(book));
  const title = stats
    ? `${book.title} narxi — ${formatNumber(stats.min)} so'mdan`
    : `${book.title} — narxlar`;
  const description = stats
    ? `${book.title}${book.titleCyrl ? ` (${book.titleCyrl})` : ""}, ${book.author.name}: ${stats.count} ta taklif, ${formatNumber(stats.min)} – ${formatNumber(stats.max)} so'm. Do'kon, nashriyot va marketpleyslardagi narxlarni solishtiring.`
    : `${book.title}, ${book.author.name}. Kitob narxlarini do'kon, nashriyot va marketpleyslarda solishtiring.`;
  const url = `/kitob/${book.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Buqancha`, description, url, type: "book" },
  };
}

const SORTS: Array<[OfferSort, string]> = [
  ["arzon", "Arzonroq"],
  ["qimmat", "Qimmatroq"],
  ["yangi", "Yangilangan"],
];

const TYPE_PARAMS: Array<[string, SellerType]> = Object.entries(SELLER_TYPE_PARAM);

export default async function BookPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const tur = typeof sp.tur === "string" && sp.tur in SELLER_TYPE_PARAM ? sp.tur : undefined;
  const onlyInStock = sp.mavjud === "1";
  const sort: OfferSort = SORTS.some(([s]) => s === sp.tartib) ? (sp.tartib as OfferSort) : "arzon";

  const everyOffer = flattenOffers(book);
  // haqiqiy narxlar bo'lsa, asosiy ro'yxat va hisob-kitob faqat ular bo'yicha;
  // namunaviylar pastda alohida ko'rsatiladi
  const { primary: allOffers, sample: sampleOffers, onlySample } = splitOffers(everyOffer);
  const stats = offerStats(everyOffer);
  const offers = filterOffers(allOffers, {
    types: tur ? [SELLER_TYPE_PARAM[tur]] : undefined,
    onlyInStock,
    sort,
  });

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { tur, mavjud: onlyInStock ? "1" : undefined, tartib: sort === "arzon" ? undefined : sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return `/kitob/${book.slug}${qs ? `?${qs}` : ""}#takliflar`;
  };

  const typeCounts = Object.fromEntries(
    TYPE_PARAMS.map(([p, t]) => [p, allOffers.filter((o) => o.seller.type === t).length]),
  );

  const cover = bookImage(book);
  const coverSeller = cover?.source && cover.source !== "own" ? everyOffer.find((o) => o.seller.slug === cover.source)?.seller : null;

  const author = await getAuthorBySlug(book.author.slug);
  const moreByAuthor = author?.books.filter((b) => b.id !== book.id).slice(0, 4) ?? [];
  const pageUrl = absoluteUrl(`/kitob/${book.slug}`);

  return (
    <article className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd data={bookJsonLd(book, allOffers, stats, pageUrl)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Bosh sahifa", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: book.author.name, item: absoluteUrl(`/muallif/${book.author.slug}`) },
            { "@type": "ListItem", position: 3, name: book.title, item: pageUrl },
          ],
        }}
      />

      <nav aria-label="Yo'l" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-text">Bosh sahifa</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/muallif/${book.author.slug}`} className="hover:text-text">{book.author.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-text" aria-current="page">{book.title}</li>
        </ol>
      </nav>

      <header className="mt-6 grid grid-cols-[96px_1fr] gap-4 sm:grid-cols-[180px_1fr] sm:gap-8 lg:grid-cols-[220px_1fr_320px]">
        <figure>
          <div className="koinot-float">
            <Cover title={book.title} author={book.author.name} color={book.coverColor} size="lg" className="w-full" image={cover?.url} />
          </div>
          {cover && (
            <figcaption className="mt-2 text-center text-[11px] text-muted">
              Rasm:{" "}
              {cover.source === "own" ? (
                "Buqancha"
              ) : coverSeller?.website ? (
                <a href={coverSeller.website} target="_blank" rel="nofollow noopener noreferrer" className="underline">
                  {coverSeller.name}
                </a>
              ) : (
                (coverSeller?.name ?? cover.source)
              )}
            </figcaption>
          )}
        </figure>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl [text-wrap:balance]">{book.title}</h1>
          {book.titleCyrl && (
            <p className="mt-1 text-sm text-muted">
              Kirill yozuvida: <span lang="uz-Cyrl" className="text-text">{book.titleCyrl}</span>
            </p>
          )}
          <p className="mt-2 text-base">
            <Link href={`/muallif/${book.author.slug}`} className="font-semibold text-accent hover:underline">
              {book.author.name}
            </Link>
            {book.author.nameCyrl && (
              <span lang="uz-Cyrl" className="text-muted"> · {book.author.nameCyrl}</span>
            )}
          </p>
          {book.description && <p className="mt-4 hidden max-w-prose text-[15px] text-muted sm:block">{book.description}</p>}
        </div>

        {book.description && <p className="col-span-2 max-w-prose text-[15px] text-muted sm:hidden">{book.description}</p>}

        {stats && (
          <aside className="card col-span-2 grid grid-cols-2 gap-px overflow-hidden p-0 sm:col-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:self-start" aria-label="Narxlar xulosasi">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Eng arzon</p>
              <p className="tabular mt-1 whitespace-nowrap text-xl font-bold text-price sm:text-2xl lg:text-xl xl:text-2xl">{formatPrice(stats.min)}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{stats.cheapest.seller.name}</p>
            </div>
            <div className="border-l border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Eng qimmat</p>
              <p className="tabular mt-1 whitespace-nowrap text-xl font-bold sm:text-2xl lg:text-xl xl:text-2xl">{formatPrice(stats.max)}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{stats.priciest.seller.name}</p>
            </div>
            <div className="col-span-2 border-t border-border px-4 py-3 text-xs text-muted">
              {stats.count} ta taklif · {stats.inStockCount} tasi mavjud · yangilangan: {formatDate(stats.lastUpdated)}
              {stats.max > stats.min && (
                <>
                  {" "}· farq: <span className="tabular font-semibold text-text">{formatPrice(stats.max - stats.min)}</span>
                </>
              )}
            </div>
          </aside>
        )}
      </header>

      <section id="takliflar" className="mt-10 scroll-mt-28" aria-labelledby="offers-h">
        <h2 id="offers-h" className="text-xl sm:text-2xl">
          {book.title} narxlari
        </h2>
        {onlySample && <SampleNotice all className="mt-4" />}

        <div className="mt-5 flex flex-col gap-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Sotuvchi turi">
            <Chip href={href({ tur: undefined })} active={!tur}>
              Hammasi <Count n={allOffers.length} />
            </Chip>
            {TYPE_PARAMS.map(([p, t]) => (
              <Chip key={p} href={href({ tur: p })} active={tur === p} disabled={!typeCounts[p]}>
                {SELLER_TYPE_PLURAL[t]} <Count n={typeCounts[p]} />
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={href({ mavjud: onlyInStock ? undefined : "1" })}
              role="switch"
              aria-checked={onlyInStock}
              className="flex items-center gap-2 text-sm font-medium"
              scroll={false}
            >
              <span className={`relative h-6 w-10 rounded-full transition-colors ${onlyInStock ? "bg-accent" : "bg-border"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${onlyInStock ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Faqat mavjudlari
            </Link>
            <div className="flex items-center gap-1 text-sm" role="group" aria-label="Tartiblash">
              <span className="mr-1 text-muted">Tartib:</span>
              {SORTS.map(([s, label]) => (
                <Link
                  key={s}
                  href={href({ tartib: s === "arzon" ? undefined : s })}
                  scroll={false}
                  aria-current={sort === s ? "true" : undefined}
                  className={`rounded-full px-3 py-1.5 font-medium ${sort === s ? "bg-surface-2 text-text ring-1 ring-border" : "text-muted hover:text-text"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {offers.length ? (
          <ol className="mt-5 flex flex-col gap-3">
            {offers.map((o, i) => (
              <OfferCard key={o.id} offer={o} rank={i + 1} isCheapest={o.id === stats?.cheapest.id} />
            ))}
          </ol>
        ) : (
          <div className="card mt-5 p-6 text-center text-muted">
            Bu filtr bo'yicha taklif topilmadi.{" "}
            <Link href={href({ tur: undefined, mavjud: undefined })} className="font-semibold text-accent hover:underline">
              Filtrni tozalash
            </Link>
          </div>
        )}
      </section>

      {!onlySample && sampleOffers.length > 0 && (
        <details className="mt-6 rounded-card border border-dashed border-border p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            Namunaviy narxlar ({sampleOffers.length}) — haqiqiy emas, solishtirishda hisobga olinmaydi
          </summary>
          <ul className="mt-3 divide-y divide-border text-sm">
            {sampleOffers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-muted">
                <span>
                  {o.seller.name} · {o.edition.publisher}
                </span>
                <span className="tabular line-through decoration-1">{formatPrice(o.price)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="mt-12" aria-labelledby="editions-h">
        <h2 id="editions-h" className="text-xl sm:text-2xl">Nashrlar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {book.editions.map((e) => (
            <div key={e.id} className="card flex gap-4 p-4">
            {e.imageUrl && <Cover title="" color="#888" size="sm" image={e.imageUrl} className="w-16 shrink-0 self-start" />}
            <dl className="grid flex-1 grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Nashriyot</dt>
              <dd className="font-semibold">{e.publisher}</dd>
              {e.language && LANGUAGE_LABEL[e.language] && (<><dt className="text-muted">Til</dt><dd>{LANGUAGE_LABEL[e.language]}</dd></>)}
              {e.year && (<><dt className="text-muted">Yil</dt><dd className="tabular">{e.year}</dd></>)}
              {e.pages && (<><dt className="text-muted">Betlar</dt><dd className="tabular">{e.pages} bet</dd></>)}
              {e.cover && (<><dt className="text-muted">Muqova</dt><dd>{e.cover}</dd></>)}
              <dt className="text-muted">ISBN</dt>
              <dd className="tabular">{e.isbn ?? "—"}</dd>
            </dl>
            </div>
          ))}
        </div>
      </section>

      {moreByAuthor.length > 0 && (
        <section className="mt-12" aria-labelledby="more-h">
          <h2 id="more-h" className="text-xl sm:text-2xl">{book.author.name}ning boshqa kitoblari</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {moreByAuthor.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Chip({ href, active, disabled, children }: { href: string; active: boolean; disabled?: boolean; children: React.ReactNode }) {
  const cls = `shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
    active ? "border-accent bg-accent text-accent-contrast" : "border-border bg-surface-2 hover:border-accent"
  }`;
  if (disabled && !active) return <span className={`${cls} opacity-40`} aria-disabled="true">{children}</span>;
  return (
    <Link href={href} scroll={false} aria-current={active ? "true" : undefined} className={cls}>
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return <span className="tabular ml-0.5 opacity-70">{n}</span>;
}

function OfferCard({ offer: o, rank, isCheapest }: { offer: OfferRow; rank: number; isCheapest: boolean }) {
  return (
    <li className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 ${o.inStock ? "" : "opacity-70"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="tabular mt-0.5 hidden w-6 shrink-0 text-center font-heading text-lg text-muted sm:block">{rank}</span>
        {o.edition.imageUrl && (
          <Cover title="" color="#888" size="sm" image={o.edition.imageUrl} className="w-11 shrink-0 sm:w-12" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold">{o.seller.name}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">
              {SELLER_TYPE_LABEL[o.seller.type]}
            </span>
            {o.source === "PARTNER" && !o.isSample && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Hamkor</span>
            )}
            {isCheapest && o.inStock && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Eng arzon</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {o.edition.language && LANGUAGE_LABEL[o.edition.language] && (
              <span className="mr-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-text">
                {LANGUAGE_LABEL[o.edition.language]}
              </span>
            )}
            {o.edition.publisher}
            {o.edition.year ? `, ${o.edition.year}` : ""}
            {o.edition.pages ? `, ${o.edition.pages} bet` : ""}
            {o.edition.cover ? `, ${o.edition.cover} muqova` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {o.seller.city} · tekshirilgan {formatRelative(o.checkedAt ?? o.updatedAt)} · manba: {SOURCE_LABEL[o.source]}
            {o.isSample ? " · namunaviy narx" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-3 sm:border-0 sm:pt-0">
        <div className="text-left sm:text-right">
          <p className={`tabular whitespace-nowrap text-xl font-bold ${o.inStock ? "text-price" : "text-muted line-through decoration-1"}`}>
            {formatPrice(o.price)}
          </p>
          <p className={`text-xs font-medium ${o.inStock ? "text-accent" : "text-danger"}`}>
            {o.inStock ? "Mavjud" : "Hozir mavjud emas"}
          </p>
          <PriceChange offer={o} />
        </div>
        {o.url ? (
          <a
            href={o.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
              o.inStock ? "bg-accent text-accent-contrast" : "border border-border"
            }`}
          >
            Sotuvchiga o'tish<span aria-hidden="true"> ↗</span>
            <span className="sr-only"> ({o.seller.name}, yangi oynada)</span>
          </a>
        ) : (
          <span className="shrink-0 px-2 text-xs text-muted">Sayt havolasi yo'q</span>
        )}
      </div>
    </li>
  );
}

/** Oxirgi narx o'zgarishi: "oldin 49 000 so'm" (↓/↑ foiz bilan). */
function PriceChange({ offer: o }: { offer: OfferRow }) {
  if (o.isSample || o.history.length < 2) return null;
  const prev = o.history[1].price;
  if (prev === o.price) return null;
  const pct = Math.round(((o.price - prev) / prev) * 100);
  const down = o.price < prev;
  return (
    <p className="tabular text-xs text-muted" title={`O'zgargan: ${formatDate(o.history[0].recordedAt)}`}>
      oldin {formatPrice(prev)}{" "}
      <span className={down ? "font-semibold text-accent" : "font-semibold text-danger"}>
        {down ? "↓" : "↑"}
        {Math.abs(pct) || "<1"}%
      </span>
    </p>
  );
}

function bookJsonLd(
  book: NonNullable<Awaited<ReturnType<typeof getBookBySlug>>>,
  offers: OfferRow[],
  stats: ReturnType<typeof offerStats>,
  url: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${url}#book`,
    name: book.title,
    alternateName: book.titleCyrl ?? undefined,
    description: book.description || undefined,
    image: bookImage(book)?.url,
    inLanguage: "uz",
    url,
    author: {
      "@type": "Person",
      name: book.author.name,
      alternateName: book.author.nameCyrl ?? undefined,
      url: absoluteUrl(`/muallif/${book.author.slug}`),
    },
    workExample: book.editions.map((e) => ({
      "@type": "Book",
      bookFormat: e.cover === "yumshoq" ? "https://schema.org/Paperback" : "https://schema.org/Hardcover",
      isbn: e.isbn ?? undefined,
      numberOfPages: e.pages ?? undefined,
      datePublished: e.year ? String(e.year) : undefined,
      inLanguage: e.language ?? "uz",
      publisher: { "@type": "Organization", name: e.publisher },
    })),
    offers: stats
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "UZS",
          lowPrice: stats.min,
          highPrice: stats.max,
          offerCount: stats.count,
          offers: offers.map((o) => ({
            "@type": "Offer",
            price: o.price,
            priceCurrency: "UZS",
            availability: o.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: o.url ?? url,
            seller: { "@type": "Organization", name: o.seller.name },
          })),
        }
      : undefined,
  };
}
