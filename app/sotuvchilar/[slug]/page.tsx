import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/Cover";
import { JsonLd } from "@/components/JsonLd";
import { SellerLogo } from "@/components/SellerLogo";
import { bookImage } from "@/lib/books";
import { sellerContacts } from "@/lib/contacts";
import { SELLER_TYPE_LABEL, formatNumber, formatPrice, formatRelative } from "@/lib/format";
import { isForever } from "@/lib/partner/auth";
import { sellerPhotoSrc } from "@/lib/seller/photo";
import { SELLER_SORTS, getSellerBooks, getSellerBySlug, type SellerSort } from "@/lib/sellers";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; tartib?: string; sahifa?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSellerBySlug((await params).slug);
  if (!s) return {};
  return {
    title: `${s.name} — kitoblar va narxlar`,
    description: `${s.name} (${SELLER_TYPE_LABEL[s.type].toLowerCase()}, ${s.city}) kitoblari: narxlarni boshqa do'konlar bilan solishtiring.`,
    alternates: { canonical: `/sotuvchilar/${s.slug}` },
  };
}

export default async function SellerPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const s = await getSellerBySlug(slug);
  if (!s) notFound();
  const q = (sp.q ?? "").trim().slice(0, 80);
  const sort = (sp.tartib && sp.tartib in SELLER_SORTS ? sp.tartib : "mashhur") as SellerSort;
  const page = Math.max(1, Math.min(300, Number(sp.sahifa) || 1));
  const { items, total, pages } = await getSellerBooks(s.id, q, sort, page);
  const contacts = sellerContacts(s);
  const partner = !!s.partnerUntil && s.partnerUntil > new Date();
  const href = (p: { tartib?: string; sahifa?: number }) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    const t = p.tartib ?? sort;
    if (t !== "mashhur") u.set("tartib", t);
    if (p.sahifa && p.sahifa > 1) u.set("sahifa", String(p.sahifa));
    const str = u.toString();
    return `/sotuvchilar/${s.slug}${str ? `?${str}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": s.type === "PUBLISHER" ? "Organization" : "BookStore",
          name: s.name,
          url: absoluteUrl(`/sotuvchilar/${s.slug}`),
          ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city, addressCountry: "UZ" } } : {}),
          ...(s.website ? { sameAs: [s.website] } : {}),
        }}
      />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Bosh sahifa</Link> / <Link href="/sotuvchilar" className="hover:text-text">Sotuvchilar</Link>
      </nav>

      <header className="card mt-4 grid grid-cols-[auto_1fr] items-start gap-4 p-4 sm:items-center sm:p-5">
        <SellerLogo name={s.name} src={sellerPhotoSrc(s)} size={56} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl">{s.name}</h1>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">{SELLER_TYPE_LABEL[s.type]}</span>
            {partner && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Hamkor{isForever(s.partnerUntil) ? "" : ""}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {s.city}
            {s.address && ` · ${s.address}`}
            {s.runs[0] && ` · narxlar yangilangan: ${formatRelative(s.runs[0].startedAt)}`}
          </p>
          {s.description && <p className="mt-2 max-w-2xl text-sm">{s.description}</p>}
          {contacts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {contacts.map((c) => (
                <a key={c.href} href={c.href} target={c.kind === "phone" ? undefined : "_blank"} rel="nofollow noopener noreferrer" className="rounded-full border border-border px-3 py-1 font-medium hover:border-accent">
                  {c.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">
          {s.name}dagi kitoblar <span className="tabular text-muted">({formatNumber(total)})</span>
        </h2>
        <form action={`/sotuvchilar/${s.slug}`} className="flex w-full gap-2 sm:w-auto">
          <input name="q" defaultValue={q} placeholder="Shu do'kondan qidirish" aria-label="Shu do'kondan qidirish" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm sm:w-64" />
          {sort !== "mashhur" && <input type="hidden" name="tartib" value={sort} />}
          <button className="h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-contrast">Qidirish</button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Tartib:</span>
        {(Object.keys(SELLER_SORTS) as SellerSort[]).map((k) => (
          <Link key={k} href={href({ tartib: k })} className={`rounded-full px-3 py-1.5 font-semibold ${sort === k ? "bg-accent text-accent-contrast" : "border border-border bg-surface-2"}`}>
            {SELLER_SORTS[k]}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">Kitobni bosing — barcha do&apos;konlardagi narxlari bilan solishtirasiz.</p>

      {items.length ? (
        <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map(({ book, price, inStock, otherSellers, otherMin, cheapest }) => (
            <li key={book.id}>
              <Link href={`/kitob/${book.slug}`} className="group flex flex-col gap-2 rounded-card p-2 transition-colors hover:bg-surface-2">
                <div className="relative">
                  <Cover title={book.title} author={book.author.name} color={book.coverColor} image={bookImage(book)?.url} className="w-full transition-transform duration-300 group-hover:-translate-y-1" />
                  {cheapest && otherSellers > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-contrast shadow">Eng arzon shu yerda</span>
                  )}
                </div>
                <div className="min-w-0 px-0.5">
                  <h3 className="line-clamp-2 text-[15px] font-semibold">{book.title}</h3>
                  <p className="truncate text-sm text-muted">{book.author.name}</p>
                  <p className="mt-1 text-sm">
                    <span className={`tabular font-bold ${inStock ? "text-price" : "text-muted line-through"}`}>{formatPrice(price)}</span>
                    {!inStock && <span className="text-xs text-muted"> · mavjud emas</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {otherSellers > 0 && otherMin !== null ? (
                      <>
                        yana {otherSellers} ta do&apos;konda · <span className="tabular">{formatNumber(otherMin)}</span> so&apos;mdan →
                      </>
                    ) : (
                      "faqat shu yerda"
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card mt-6 p-8 text-center text-muted">
          {q ? "Bu do'konda bunday kitob topilmadi." : "Bu sotuvchining narxlari hozircha Buqanchada yo'q."}
        </p>
      )}

      {pages > 1 && (
        <nav aria-label="Sahifalar" className="mt-10 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={href({ sahifa: page - 1 })} className="rounded-full border border-border px-4 py-2 font-semibold hover:border-accent">← Oldingi</Link>
          )}
          <span className="px-2 text-muted tabular">{page} / {pages}</span>
          {page < pages && (
            <Link href={href({ sahifa: page + 1 })} className="rounded-full border border-border px-4 py-2 font-semibold hover:border-accent">Keyingi →</Link>
          )}
        </nav>
      )}
    </div>
  );
}
