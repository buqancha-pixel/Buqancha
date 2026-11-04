import Link from "next/link";
import { Cover } from "./Cover";
import { bookImage, priceRange, type BookCardData } from "@/lib/books";
import { LANGUAGE_LABEL, formatNumber, isUzbekEdition } from "@/lib/format";

export function BookCard({ book }: { book: BookCardData }) {
  const range = priceRange(book);
  // barcha nashrlari boshqa tilda bo'lsa — belgi
  const lang = book.editions.length && book.editions.every((e) => !isUzbekEdition(e.language)) ? book.editions[0].language : null;
  return (
    <Link
      href={`/kitob/${book.slug}`}
      className="group flex flex-col gap-3 rounded-card p-2 transition-colors hover:bg-surface-2"
    >
      <Cover
        title={book.title}
        author={book.author.name}
        color={book.coverColor}
        image={bookImage(book)?.url}
        className="w-full transition-transform duration-300 group-hover:-translate-y-1"
      />
      <div className="min-w-0 px-0.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold">{book.title}</h3>
        <p className="truncate text-sm text-muted">{book.author.name}</p>
        {lang && LANGUAGE_LABEL[lang] && (
          <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold">{LANGUAGE_LABEL[lang]}</span>
        )}
        {range && (
          <p className="mt-1 text-sm">
            <span className="tabular font-bold text-price">{formatNumber(range.min)}</span>
            <span className="text-muted"> so'mdan</span>
          </p>
        )}
      </div>
    </Link>
  );
}
