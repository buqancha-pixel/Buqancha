import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { searchBooks } from "@/lib/books";
import { formatPrice } from "@/lib/format";
import { Flash, PageTitle, inputCls, type SP } from "../ui";

export default async function AdminBooks({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const books = q
    ? await searchBooks(q, 50)
    : await prisma.book.findMany({
        where: { origin: "manual" },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { author: true, editions: { include: { offers: { select: { price: true, inStock: true, isSample: true } } } } },
      });
  return (
    <div>
      <PageTitle>Kitoblar</PageTitle>
      <Flash sp={sp} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Nomi yoki muallifi (lotin/kirill)" className={inputCls} />
        <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
      </form>
      <Link href="/admin/kitoblar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + Yangi kitob qo&apos;shish
      </Link>
      <p className="mb-2 text-sm text-muted">{q ? `"${q}" bo'yicha ${books.length} ta natija` : "Oxirgi qo'lda qo'shilgan yoki tahrirlangan kitoblar"}</p>
      <ul className="card divide-y divide-border">
        {books.map((b) => {
          const prices = b.editions.flatMap((e) => e.offers).filter((o) => !o.isSample).map((o) => o.price);
          return (
            <li key={b.id}>
              <Link href={`/admin/kitoblar/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {b.author.name} · {b.editions.length} nashr · {prices.length} narx
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular">{prices.length ? formatPrice(Math.min(...prices)) : "narx yo'q"}</span>
              </Link>
            </li>
          );
        })}
        {!books.length && <li className="px-4 py-6 text-center text-sm text-muted">Hech narsa topilmadi.</li>}
      </ul>
    </div>
  );
}
