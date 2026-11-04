import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/categories";
import { LANGUAGE_LABEL, formatNumber, formatPrice } from "@/lib/format";
import { searchKey } from "@/lib/normalize";
import { bulkCategoryAction, quickCategoryAction, removeCategoryAction } from "../actions";
import { Flash, PageTitle, inputCls, type SP } from "../ui";
import { QuickCategory, RemoveChip, SelectAll } from "./QuickCategory";

const PER_PAGE = 60;

export default async function AdminBooks({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const bolim = sp.bolim ?? "";
  const til = sp.til ?? "";
  const page = Math.max(1, Number(sp.sahifa) || 1);

  const and: Prisma.BookWhereInput[] = [];
  for (const t of searchKey(q).split(" ").filter(Boolean).slice(0, 8)) and.push({ searchKey: { contains: t } });
  if (bolim === "yoq") and.push({ categories: { isEmpty: true } });
  else if (CATEGORY_BY_SLUG.has(bolim)) and.push({ categories: { has: bolim } });
  const uzEd: Prisma.EditionWhereInput = { OR: [{ language: null }, { language: { in: ["uz", "uz-Cyrl"] } }] };
  if (til === "uz") and.push({ editions: { some: uzEd } });
  else if (til === "ru" || til === "en") and.push({ editions: { none: uzEd, some: { language: til } } });
  if (!q && !bolim && !til) and.push({ editions: { some: { offers: { some: { isSample: false } } } } });
  const where: Prisma.BookWhereInput = { AND: and };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ searchCount: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { author: true, editions: { include: { offers: { where: { isSample: false }, select: { price: true } } } } },
    }),
    prisma.book.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => `/admin/kitoblar?${new URLSearchParams({ ...(q ? { q } : {}), ...(bolim ? { bolim } : {}), ...(til ? { til } : {}), ...(p > 1 ? { sahifa: String(p) } : {}) })}`;
  const back = qs(page);

  return (
    <div>
      <PageTitle>Kitoblar</PageTitle>
      <Flash sp={sp} />
      <Link href="/admin/kitoblar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + Yangi kitob qo&apos;shish
      </Link>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Nomi yoki muallifi" className={inputCls} />
        <select name="bolim" defaultValue={bolim} className={inputCls}>
          <option value="">Barcha bo&apos;limlar</option>
          <option value="yoq">Bo&apos;limsiz kitoblar</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="til" defaultValue={til} className={inputCls}>
          <option value="">Barcha tillar</option>
          <option value="uz">O&apos;zbekcha</option>
          <option value="ru">Ruscha</option>
          <option value="en">Inglizcha</option>
        </select>
        <button className="h-11 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Ko&apos;rsatish</button>
      </form>
      <p className="mb-2 text-sm text-muted">
        {formatNumber(total)} ta kitob{bolim === "yoq" ? " bo'limsiz" : ""}. Kitob yonidagi ro&apos;yxatdan bo&apos;lim tanlang — darhol saqlanadi.
      </p>

      <form action={bulkCategoryAction}>
        <input type="hidden" name="back" value={back} />
        <ul className="card divide-y divide-border">
          {books.map((b) => {
            const prices = b.editions.flatMap((e) => e.offers).map((o) => o.price);
            const lang = b.editions.length && b.editions.every((e) => e.language && !["uz", "uz-Cyrl"].includes(e.language)) ? b.editions[0].language : null;
            return (
              <li key={b.id} className="flex gap-3 px-3 py-3">
                <input type="checkbox" name="ids" value={b.id} aria-label={b.title} className="mt-1 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/kitoblar/${b.id}`} className="block truncate font-medium hover:underline">
                    {b.title}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {b.author.name}
                    {lang && LANGUAGE_LABEL[lang] ? ` · ${LANGUAGE_LABEL[lang]}` : ""} · {prices.length ? formatPrice(Math.min(...prices)) : "narx yo'q"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {b.categories.map((c) => (
                      <RemoveChip key={c} bookId={b.id} slug={c} name={CATEGORY_BY_SLUG.get(c)?.name ?? c} back={back} action={removeCategoryAction} />
                    ))}
                    <QuickCategory
                      bookId={b.id}
                      back={back}
                      options={CATEGORIES.filter((c) => !b.categories.includes(c.slug)).map((c) => ({ slug: c.slug, name: c.name }))}
                      action={quickCategoryAction}
                    />
                  </div>
                </div>
              </li>
            );
          })}
          {!books.length && <li className="px-4 py-6 text-center text-sm text-muted">Hech narsa topilmadi.</li>}
        </ul>

        {books.length > 0 && (
          <div className="sticky bottom-3 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-bg p-3 shadow-lg">
            <SelectAll />
            <select name="bolim" aria-label="Bo'lim" className="h-10 flex-1 rounded-full border border-border bg-surface-2 px-3 text-sm" defaultValue="">
              <option value="" disabled>Bo&apos;limni tanlang</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <button name="mode" value="add" className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-accent-contrast">
              Belgilanganlarga qo&apos;shish
            </button>
            <button name="mode" value="remove" className="h-10 rounded-full border border-border px-4 text-sm font-semibold">
              Olib tashlash
            </button>
          </div>
        )}
      </form>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="underline">← Oldingi</Link> : <span />}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="underline">Keyingi →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
