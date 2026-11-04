import Link from "next/link";
import type { BannerBook } from "@/lib/books";
import { formatPrice } from "@/lib/format";
import { BannerCarousel } from "./BannerCarousel";
import { Cover } from "./Cover";

/** Bosh sahifa tepasidagi "Yangi kitoblar" banneri (reklama banneri uslubida). */
export function NewBooksBanner({ books }: { books: BannerBook[] }) {
  if (!books.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6" aria-label="Yangi kitoblar">
      <BannerCarousel label="Yangi kitoblar">
        {books.map((b) => (
          <Slide key={b.id} book={b} />
        ))}
      </BannerCarousel>
    </section>
  );
}

function Slide({ book }: { book: BannerBook }) {
  const price = book.minPrice != null ? `${formatPrice(book.minPrice)}dan` : null;
  return (
    <Link
      href={`/kitob/${book.slug}`}
      className="banner-slide group relative block overflow-hidden rounded-card text-white"
      style={{ ["--c" as string]: book.color }}
      aria-label={`Yangi: ${book.title}, ${book.author}${price ? `, ${price}` : ""}`}
    >
      {/* fon: kitob rangidan gradient va yorug'lik dog'lari */}
      <div className="banner-bg absolute inset-0" aria-hidden="true" />
      <div className="banner-shade absolute inset-0" aria-hidden="true" />
      <div className="banner-ring pointer-events-none absolute -right-16 -top-16 size-64 rounded-full" aria-hidden="true" />

      <div className="relative grid min-h-[200px] grid-cols-[1fr_auto] items-center gap-4 p-5 sm:min-h-[280px] sm:gap-10 sm:px-20 sm:py-10">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="rounded-full bg-white px-2.5 py-1 text-neutral-900">Yangi</span>
            {book.note && <span className="opacity-90">{book.note}</span>}
          </p>
          <h3 className="mt-3 line-clamp-2 font-heading text-[1.35rem] leading-tight [text-wrap:balance] sm:text-4xl">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm opacity-85 sm:mt-2 sm:text-base">{book.author}</p>
          {price && (
            <p className="mt-3 text-sm sm:mt-5 sm:text-base">
              <span className="tabular text-lg font-bold sm:text-2xl">{price}</span>
              {book.sellers > 1 && <span className="whitespace-nowrap opacity-85"> · {book.sellers} ta do&apos;konda</span>}
            </p>
          )}
          <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-neutral-900 transition-transform group-hover:translate-x-0.5 sm:h-11 sm:px-5">
            Narxlarni solishtirish <span aria-hidden="true">→</span>
          </span>
        </div>
        <div className="banner-cover w-24 sm:w-44">
          <Cover title={book.title} author={book.author} color={book.color} image={book.image} size="md" />
        </div>
      </div>
    </Link>
  );
}
