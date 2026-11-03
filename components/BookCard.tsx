import Link from "next/link";
import { Cover } from "./Cover";
import { bookImage, priceRange, type BookCardData } from "@/lib/books";
import { formatNumber } from "@/lib/format";

export function BookCard({ book }: { book: BookCardData }) {
  const range = priceRange(book);
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
