import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { JsonLd } from "@/components/JsonLd";
import { getAuthorBySlug, priceRange } from "@/lib/books";
import { formatNumber } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Muallif topilmadi" };
  const mins = author.books.map(priceRange).filter(Boolean).map((r) => r!.min);
  const from = mins.length ? ` — ${formatNumber(Math.min(...mins))} so'mdan` : "";
  return {
    title: `${author.name} kitoblari narxi${from}`,
    description: `${author.name}${author.nameCyrl ? ` (${author.nameCyrl})` : ""} kitoblari: ${author.books.map((b) => b.title).join(", ")}. Narxlarni do'kon, nashriyot va marketpleyslarda solishtiring.`,
    alternates: { canonical: `/muallif/${author.slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const years = author.birthYear ? `${author.birthYear}–${author.deathYear ?? ""}` : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: author.name,
          alternateName: author.nameCyrl ?? undefined,
          description: author.bio ?? undefined,
          url: absoluteUrl(`/muallif/${author.slug}`),
        }}
      />
      <nav aria-label="Yo'l" className="text-sm text-muted">
        <Link href="/" className="hover:text-text">Bosh sahifa</Link> <span aria-hidden="true">/</span>{" "}
        <span className="text-text">{author.name}</span>
      </nav>
      <header className="mt-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Muallif</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">{author.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {author.nameCyrl && <span lang="uz-Cyrl">{author.nameCyrl}</span>}
          {author.nameCyrl && years && " · "}
          {years && <span className="tabular">{years}</span>}
        </p>
        {author.bio && <p className="mt-4 text-[15px] text-muted">{author.bio}</p>}
      </header>
      <section className="mt-10" aria-labelledby="books-h">
        <h2 id="books-h" className="text-xl sm:text-2xl">Kitoblari ({author.books.length})</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {author.books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
