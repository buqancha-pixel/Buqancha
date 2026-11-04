import Link from "next/link";
import { BookCard } from "./BookCard";
import { JsonLd } from "./JsonLd";
import { CATALOG_SORTS, type CatalogSort, getCatalogPage, getCategoryCounts, topicTree } from "@/lib/catalog";
import { LANGUAGES, type Category, type Language } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export function parseCatalogParams(sp: { tartib?: string; sahifa?: string }) {
  const sort = (sp.tartib && sp.tartib in CATALOG_SORTS ? sp.tartib : "mashhur") as CatalogSort;
  const page = Math.max(1, Math.min(500, Number(sp.sahifa) || 1));
  return { sort, page };
}

/** Katalog sahifasi: til va mavzu qatorlari, saralash, kitoblar to'ri va sahifalash. */
export async function CatalogView({ lang, topic, sort, page }: { lang?: Language; topic?: Category; sort: CatalogSort; page: number }) {
  const [{ books, total, pages }, counts] = await Promise.all([
    getCatalogPage({ language: lang?.code ?? null, topic: topic?.slug ?? null }, sort, page),
    getCategoryCounts(),
  ]);
  const topics = topicTree(counts, lang?.code ?? null);
  const langs = LANGUAGES.filter((l) => (counts[l.code] ?? 0) > 0);
  const topicHref = (t: string | null) => (lang ? `/katalog/${lang.slug}${t ? `/${t}` : ""}` : t ? `/katalog/${t}` : "/katalog");
  const base = topicHref(topic?.slug ?? null);
  const title = topic && lang ? `${topic.name} — ${lang.name.toLowerCase()}` : (topic?.name ?? (lang ? `${lang.name} kitoblar` : "Kitoblar katalogi"));
  const about = topic?.about ?? lang?.about;
  const href = (p: { tartib?: string; sahifa?: number }) => {
    const q = new URLSearchParams();
    const t = p.tartib ?? sort;
    if (t !== "mashhur") q.set("tartib", t);
    if (p.sahifa && p.sahifa > 1) q.set("sahifa", String(p.sahifa));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const side = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2 ${active ? "bg-accent-soft font-semibold text-text" : ""}`;
  const chip = (active: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-sm ${active ? "bg-text text-bg" : "border border-border"}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          url: absoluteUrl(base),
          inLanguage: "uz",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: total,
            itemListElement: books.map((b, i) => ({ "@type": "ListItem", position: (page - 1) * 36 + i + 1, url: absoluteUrl(`/kitob/${b.slug}`), name: b.title })),
          },
        }}
      />
      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-8">
      <aside className="hidden lg:block" aria-label="Katalog bo'limlari">
        <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-3 text-sm">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Til</p>
          <Link href={topic ? `/katalog/${topic.slug}` : "/katalog"} className={side(!lang)}>
            <span>Barcha tillar</span>
            <span className="tabular text-muted">{formatNumber(counts.all ?? 0)}</span>
          </Link>
          {langs.map((l) => (
            <Link key={l.slug} href={`/katalog/${l.slug}${topic ? `/${topic.slug}` : ""}`} className={side(lang?.slug === l.slug)}>
              <span>{l.name}</span>
              <span className="tabular text-muted">{formatNumber(counts[l.code] ?? 0)}</span>
            </Link>
          ))}
          <p className="mt-3 border-t border-border px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Mavzular</p>
          <Link href={topicHref(null)} className={side(!topic)}>
            <span>Barcha mavzular</span>
          </Link>
          {topics.map((c) => (
            <Link key={c.slug} href={topicHref(c.slug)} className={`${side(topic?.slug === c.slug)} ${c.child ? "ml-3" : ""} ${c.count ? "" : "text-muted"}`}>
              <span>{c.name}</span>
              {c.count > 0 && <span className="tabular text-muted">{c.count}</span>}
            </Link>
          ))}
        </div>
      </aside>
      <div className="min-w-0">
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Bosh sahifa</Link>
        {" / "}
        <Link href="/katalog" className="hover:text-text">Katalog</Link>
        {lang && (
          <>
            {" / "}
            <Link href={`/katalog/${lang.slug}`} className="hover:text-text">{lang.name}</Link>
          </>
        )}
        {topic && <> / <span className="text-text">{topic.name}</span></>}
      </nav>
      <h1 className="mt-3 text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted">
        {about ? `${about}. ` : ""}Sotuvda bor {formatNumber(total)} ta kitob — narxlari do&apos;kon va nashriyotlar bo&apos;yicha.
      </p>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        <Link href={topic ? `/katalog/${topic.slug}` : "/katalog"} className={chip(!lang)}>
          Barcha tillar
        </Link>
        {langs.map((l) => (
          <Link key={l.slug} href={`/katalog/${l.slug}${topic && (counts[`${l.code}|${topic.slug}`] ?? 0) > 0 ? `/${topic.slug}` : ""}`} className={chip(lang?.slug === l.slug)}>
            {l.name}
          </Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        <Link href={topicHref(null)} className={chip(!topic)}>
          Barcha mavzular
        </Link>
        {topics.map((c) => (
          <Link key={c.slug} href={topicHref(c.slug)} className={`${chip(topic?.slug === c.slug)} ${c.count ? "" : "opacity-60"}`}>
            {c.name} {c.count > 0 && <span className="tabular opacity-60">{c.count}</span>}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Tartib:</span>
        {(Object.keys(CATALOG_SORTS) as CatalogSort[]).map((k) => (
          <Link key={k} href={href({ tartib: k })} className={`rounded-full px-3 py-1.5 font-semibold ${sort === k ? "bg-accent text-accent-contrast" : "border border-border bg-surface-2"}`}>
            {CATALOG_SORTS[k]}
          </Link>
        ))}
      </div>

      {books.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      ) : (
        <p className="card mt-6 p-8 text-center text-muted">Bu bo&apos;limda hozircha sotuvda kitob yo&apos;q.</p>
      )}

      {pages > 1 && (
        <nav aria-label="Sahifalar" className="mt-10 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={href({ sahifa: page - 1 })} className="rounded-full border border-border px-4 py-2 font-semibold hover:border-accent">
              ← Oldingi
            </Link>
          )}
          <span className="px-2 text-muted tabular">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={href({ sahifa: page + 1 })} className="rounded-full border border-border px-4 py-2 font-semibold hover:border-accent">
              Keyingi →
            </Link>
          )}
        </nav>
      )}
      </div>
      </div>
    </div>
  );
}
