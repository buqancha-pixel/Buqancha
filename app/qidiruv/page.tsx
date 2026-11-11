import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { SearchForm } from "@/components/SearchForm";
import { BookCard } from "@/components/BookCard";
import { bumpSearchCount, getPopularBooks, searchBooks } from "@/lib/books";

type Search = Promise<{ q?: string | string[] }>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  return {
    title: query ? `"${query}" bo'yicha qidiruv` : "Kitob qidirish",
    description: "Kitob nomi yoki muallif bo'yicha qidiring va narxlarni solishtiring.",
    alternates: { canonical: "/qidiruv" },
    // qidiruv natijalari indekslanmaydi, lekin havolalar kuzatiladi
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, 120);
  const results = query ? await searchBooks(query) : [];
  const popular = !results.length ? await getPopularBooks(4) : [];

  if (results.length) {
    const ids = results.slice(0, 3).map((b) => b.id);
    after(() => bumpSearchCount(ids).catch(() => {}));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-2xl sm:text-3xl">{query ? "Qidiruv natijalari" : "Kitob qidirish"}</h1>
      <div className="mt-5 max-w-2xl">
        <SearchForm defaultValue={query} size="lg" autoFocus={!query} />
      </div>

      {query && (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {results.length ? (
            <>
              <span className="font-semibold text-text">«{query}»</span> bo'yicha {results.length} ta kitob topildi
            </>
          ) : (
            <>
              <span className="font-semibold text-text">«{query}»</span> bo'yicha hech narsa topilmadi. Nomni boshqacha
              yozib ko'ring yoki muallif ismini kiriting.
            </>
          )}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}

      {popular.length > 0 && (
        <section className="mt-12" aria-labelledby="pop-h">
          <h2 id="pop-h" className="text-xl">Ko'p qidirilgan kitoblar</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {popular.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
          <p className="mt-8 text-sm text-muted">
            Kerakli kitob yo'qmi? Siz sotuvchi bo'lsangiz,{" "}
            <Link href="/hamkorlik" className="font-semibold text-accent hover:underline">
              hamkorlik arizasini
            </Link>{" "}
            yuboring.
          </p>
        </section>
      )}
    </div>
  );
}
