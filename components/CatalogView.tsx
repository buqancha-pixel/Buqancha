import Link from "next/link";
import { BookCard } from "./BookCard";
import { JsonLd } from "./JsonLd";
import { CATALOG_SORTS, type CatalogSort, getCatalogPage, getCategoryCounts, menuCategories } from "@/lib/catalog";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export function parseCatalogParams(sp: { tartib?: string; sahifa?: string }) {
  const sort = (sp.tartib && sp.tartib in CATALOG_SORTS ? sp.tartib : "mashhur") as CatalogSort;
  const page = Math.max(1, Math.min(500, Number(sp.sahifa) || 1));
  return { sort, page };
}

/** Katalog sahifasi: bo'limlar qatori, saralash, kitoblar to'ri va sahifalash. */
export async function CatalogView({ slug, sort, page }: { slug: string | null; sort: CatalogSort; page: number }) {
  const cat = slug ? CATEGORY_BY_SLUG.get(slug)! : null;
  const [{ books, total, pages }, counts] = await Promise.all([getCatalogPage(slug, sort, page), getCategoryCounts()]);
  const cats = menuCategories(counts);
  const base = slug ? `/katalog/${slug}` : "/katalog";
  const href = (p: { tartib?: string; sahifa?: number }) => {
    const q = new URLSearchParams();
    const t = p.tartib ?? sort;
    if (t !== "mashhur") q.set("tartib", t);
    if (p.sahifa && p.sahifa > 1) q.set("sahifa", String(p.sahifa));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat?.name ?? "Kitoblar katalogi",
          url: absoluteUrl(base),
          inLanguage: "uz",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: total,
            itemListElement: books.map((b, i) => ({ "@type": "ListItem", position: (page - 1) * 36 + i + 1, url: absoluteUrl(`/kitob/${b.slug}`), name: b.title })),
          },
        }}
      />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Bosh sahifa</Link>
        {" / "}
        {cat ? (
          <>
            <Link href="/katalog" className="hover:text-text">Katalog</Link> / <span className="text-text">{cat.name}</span>
          </>
        ) : (
          <span className="text-text">Katalog</span>
        )}
      </nav>
      <h1 className="mt-3 text-3xl sm:text-4xl">{cat?.name ?? "Kitoblar katalogi"}</h1>
      <p className="mt-2 text-muted">
        {cat ? `${cat.about}. ` : ""}Sotuvda bor {formatNumber(total)} ta kitob — narxlari do&apos;kon va nashriyotlar bo&apos;yicha.
      </p>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href="/katalog" className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!slug ? "bg-text text-bg" : "border border-border"}`}>
          Hammasi
        </Link>
        {cats.map((c) => (
          <Link key={c.slug} href={`/katalog/${c.slug}`} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${slug === c.slug ? "bg-text text-bg" : "border border-border"}`}>
            {c.name}
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
  );
}
