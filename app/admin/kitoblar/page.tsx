import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { LANGUAGE_LABEL, formatNumber, formatPrice } from "@/lib/format";
import { searchKey } from "@/lib/normalize";
import { bookImage } from "@/lib/books";
import { Cover } from "@/components/Cover";
import { AdminDeleteBook } from "@/components/AdminDeleteBook";
import { bulkDeleteBooksAction } from "../actions";
import { Flash, PageTitle, inputCls, type SP } from "../ui";
import { SelectAllBooks } from "./SelectAllBooks";

const PER_PAGE = 60;
const SORTS = { mashhur: "Mashhur", yangi: "Yangi qo'shilgan", eski: "Eski" } as const;

export default async function AdminBooks({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const til = sp.til ?? "";
  const tartib = (sp.tartib && sp.tartib in SORTS ? sp.tartib : "mashhur") as keyof typeof SORTS;
  const rasmli = sp.korinish !== "royxat"; // sukut — muqovali (katalogdagidek)
  const page = Math.max(1, Number(sp.sahifa) || 1);

  const and: Prisma.BookWhereInput[] = [];
  for (const t of searchKey(q).split(" ").filter(Boolean).slice(0, 8)) and.push({ searchKey: { contains: t } });
  const uzEd: Prisma.EditionWhereInput = { OR: [{ language: null }, { language: { in: ["uz", "uz-Cyrl"] } }] };
  if (til === "uz") and.push({ editions: { some: uzEd } });
  else if (til === "ru" || til === "en") and.push({ editions: { none: uzEd, some: { language: til } } });
  if (!q && !til) and.push({ editions: { some: { offers: { some: { isSample: false } } } } });
  const where: Prisma.BookWhereInput = { AND: and };
  const orderBy: Prisma.BookOrderByWithRelationInput[] =
    tartib === "yangi" ? [{ createdAt: "desc" }] : tartib === "eski" ? [{ createdAt: "asc" }] : [{ searchCount: "desc" }, { updatedAt: "desc" }];

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { author: true, editions: { include: { offers: { where: { isSample: false }, select: { price: true } } } } },
    }),
    prisma.book.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: { sahifa?: number; korinish?: string; tartib?: string }) => {
    const k = p.korinish ?? (rasmli ? "" : "royxat");
    const t = p.tartib ?? tartib;
    const params = new URLSearchParams({
      ...(q ? { q } : {}),
      ...(til ? { til } : {}),
      ...(t !== "mashhur" ? { tartib: t } : {}),
      ...(k ? { korinish: k } : {}),
      ...(p.sahifa && p.sahifa > 1 ? { sahifa: String(p.sahifa) } : {}),
    });
    const s = params.toString();
    return s ? `/admin/kitoblar?${s}` : "/admin/kitoblar";
  };
  const back = qs({ sahifa: page });
  const chip = (active: boolean) => `rounded-full px-3 py-1.5 text-sm ${active ? "bg-text text-bg" : "border border-border"}`;
  const row = (b: (typeof books)[number]) => {
    const prices = b.editions.flatMap((e) => e.offers).map((o) => o.price);
    const lang = b.editions.length && b.editions.every((e) => e.language && !["uz", "uz-Cyrl"].includes(e.language)) ? b.editions[0].language : null;
    return { price: prices.length ? formatPrice(Math.min(...prices)) : "narx yo'q", lang: lang && LANGUAGE_LABEL[lang] ? LANGUAGE_LABEL[lang] : null };
  };

  return (
    <div>
      <PageTitle>Kitoblar</PageTitle>
      <Flash sp={sp} />
      <Link href="/admin/kitoblar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + Yangi kitob qo&apos;shish
      </Link>

      <form className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Nomi yoki muallifi" className={inputCls} />
        <select name="til" defaultValue={til} className={inputCls}>
          <option value="">Barcha tillar</option>
          <option value="uz">O&apos;zbekcha</option>
          <option value="ru">Ruscha</option>
          <option value="en">Inglizcha</option>
        </select>
        {tartib !== "mashhur" && <input type="hidden" name="tartib" value={tartib} />}
        {!rasmli && <input type="hidden" name="korinish" value="royxat" />}
        <button className="h-11 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Ko&apos;rsatish</button>
      </form>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={qs({ korinish: "" })} className={chip(rasmli)}>🖼 Muqovali</Link>
        <Link href={qs({ korinish: "royxat" })} className={chip(!rasmli)}>☰ Ro&apos;yxat</Link>
        <span className="mx-1 text-muted">·</span>
        {(Object.keys(SORTS) as Array<keyof typeof SORTS>).map((k) => (
          <Link key={k} href={qs({ tartib: k })} className={chip(tartib === k)}>{SORTS[k]}</Link>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted">
        {formatNumber(total)} ta kitob. {rasmli ? "Keraksizini 🗑 bilan o'chiring yoki bir nechtasini belgilab, pastdan birdaniga o'chiring." : ""}
      </p>

      {rasmli ? (
        <form action={bulkDeleteBooksAction}>
          <input type="hidden" name="back" value={back} />
          <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {books.map((b) => {
              const r = row(b);
              return (
                <li key={b.id} className="relative">
                  <label className="absolute left-2 top-2 z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-black/60 ring-1 ring-white/30">
                    <input type="checkbox" name="ids" value={b.id} aria-label={`${b.title} — belgilash`} className="size-4 accent-red-600" />
                  </label>
                  <AdminDeleteBook id={b.id} title={b.title} variant="card" />
                  <Link href={`/admin/kitoblar/${b.id}`} className="block rounded-xl p-1 hover:bg-surface-2">
                    <Cover title={b.title} author={b.author.name} color={b.coverColor} image={bookImage(b)?.url} className="w-full" />
                    <span className="mt-2 line-clamp-2 block text-sm font-semibold">{b.title}</span>
                    <span className="block truncate text-xs text-muted">{b.author.name}</span>
                    <span className="block text-xs text-muted">
                      {r.lang ? `${r.lang} · ` : ""}
                      {r.price}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {!books.length && <p className="card p-6 text-center text-sm text-muted">Hech narsa topilmadi.</p>}
          {books.length > 0 && (
            <div className="sticky bottom-2 z-20 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-bg px-3 py-2 text-xs shadow-lg">
              <SelectAllBooks />
              <label className="flex items-center gap-1.5">
                <input type="checkbox" name="confirm" value="ha" className="h-4 w-4" />
                Ha, o&apos;chirilsin
              </label>
              <button className="ml-auto h-9 rounded-full bg-red-600 px-4 text-xs font-semibold text-white">Belgilanganlarni o&apos;chirish</button>
            </div>
          )}
        </form>
      ) : (
        <ul className="card divide-y divide-border">
          {books.map((b) => {
            const r = row(b);
            return (
              <li key={b.id} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/kitoblar/${b.id}`} className="block truncate font-medium hover:underline">
                    {b.title}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {b.author.name}
                    {r.lang ? ` · ${r.lang}` : ""} · {r.price}
                  </p>
                </div>
                <AdminDeleteBook id={b.id} title={b.title} variant="button" />
              </li>
            );
          })}
          {!books.length && <li className="px-4 py-6 text-center text-sm text-muted">Hech narsa topilmadi.</li>}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ sahifa: page - 1 })} className="underline">← Oldingi</Link> : <span />}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={qs({ sahifa: page + 1 })} className="underline">Keyingi →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
