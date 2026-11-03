import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { formatPrice, formatNumber } from "@/lib/format";
import { pendingAction, setUnmatchedStatusAction } from "../actions";
import { Button, Flash, PageTitle, inputCls, type SP } from "../ui";

const PER_PAGE = 30;

export default async function Review({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "moslanmagan" || sp.tab === "etiborsiz" ? sp.tab : "narxlar";
  const [pendingCount, unmatchedCount, ignoredCount] = await Promise.all([
    prisma.offer.count({ where: { pendingPrice: { not: null } } }),
    prisma.unmatchedItem.count({ where: { status: "PENDING" } }),
    prisma.unmatchedItem.count({ where: { status: "IGNORED" } }),
  ]);
  const tabs: Array<[string, string, number]> = [
    ["narxlar", "Keskin o'zgargan narxlar", pendingCount],
    ["moslanmagan", "Moslanmagan", unmatchedCount],
    ["etiborsiz", "E'tiborsiz", ignoredCount],
  ];
  return (
    <div>
      <PageTitle>Ko&apos;rib chiqish</PageTitle>
      <Flash sp={sp} />
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([key, label, n]) => (
          <Link key={key} href={`/admin/korib-chiqish?tab=${key}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-accent text-accent-contrast" : "border border-border bg-surface-2"}`}>
            {label} <span className="tabular opacity-70">{formatNumber(n)}</span>
          </Link>
        ))}
      </div>
      {tab === "narxlar" ? <Pending /> : <Unmatched status={tab === "etiborsiz" ? "IGNORED" : "PENDING"} sp={sp} tab={tab} />}
    </div>
  );
}

async function Pending() {
  const offers = await prisma.offer.findMany({
    where: { pendingPrice: { not: null } },
    include: { seller: true, edition: { include: { book: true } } },
    orderBy: { updatedAt: "desc" },
  });
  if (!offers.length) return <p className="card p-6 text-center text-sm text-muted">Tasdiqlanadigan narx yo&apos;q.</p>;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Narx birdan 70% dan ko&apos;proq o&apos;zgargan — xato bo&apos;lishi mumkin. Sotuvchi sahifasini ochib tekshiring.
      </p>
      <ul className="grid gap-3">
        {offers.map((o) => (
          <li key={o.id} className="card p-4">
            <Link href={`/admin/kitoblar/${o.edition.bookId}`} className="font-medium hover:underline">{o.edition.book.title}</Link>
            <p className="text-sm text-muted">
              {o.seller.name} · {o.edition.publisher}
              {o.url && (
                <>
                  {" · "}
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="underline">sahifasi ↗</a>
                </>
              )}
            </p>
            <p className="my-2 text-lg tabular">
              {formatPrice(o.price)} → <b>{formatPrice(o.pendingPrice!)}</b>
            </p>
            <div className="flex gap-2">
              <form action={pendingAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="do" value="accept" />
                <Button className="h-10">Yangisini qabul qilish</Button>
              </form>
              <form action={pendingAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="do" value="reject" />
                <Button variant="ghost" className="h-10">Eskisi qolsin</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Unmatched({ status, sp, tab }: { status: "PENDING" | "IGNORED"; sp: Record<string, string | undefined>; tab: string }) {
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.sahifa) || 1);
  const sellers = await prisma.seller.findMany({ where: { unmatched: { some: { status } } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const where: Prisma.UnmatchedItemWhereInput = {
    status,
    ...(sp.sotuvchi ? { sellerId: sp.sotuvchi } : {}),
    ...(q ? { AND: q.split(/\s+/).filter(Boolean).slice(0, 6).map((t) => ({ OR: [{ title: { contains: t, mode: "insensitive" as const } }, { author: { contains: t, mode: "insensitive" as const } }] })) } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.unmatchedItem.findMany({ where, include: { seller: true }, orderBy: [{ isbn: { sort: "asc", nulls: "last" } }, { lastSeen: "desc" }], skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.unmatchedItem.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const qs = (p: number) => `/admin/korib-chiqish?${new URLSearchParams({ tab, ...(q ? { q } : {}), ...(sp.sotuvchi ? { sotuvchi: sp.sotuvchi } : {}), sahifa: String(p) })}`;
  const back = qs(page);
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        {status === "PENDING"
          ? "Sotuvchida bor, lekin hech bir kitobga bog'lanmagan mahsulotlar (ISBN yoki muallif yo'q, boshqa tilda va h.k.)."
          : "Avtomatik o'tkazib yuborilgan (diniy adabiyot, to'plamlar) yoki siz e'tiborsiz qoldirgan mahsulotlar. Diniy kitoblarni shu yerdan qo'shishingiz mumkin."}
      </p>
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder="Nomi yoki muallifi" className={inputCls} />
        <select name="sotuvchi" defaultValue={sp.sotuvchi ?? ""} className={inputCls}>
          <option value="">Barcha sotuvchilar</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button className="h-11 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
      </form>
      <p className="mb-2 text-sm text-muted">{formatNumber(total)} ta</p>
      <ul className="card divide-y divide-border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href={`/admin/korib-chiqish/${u.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-medium">{u.title}</span>
              <span className="block truncate text-xs text-muted">
                {u.seller.name} · {formatPrice(u.price)}
                {u.author ? ` · ${u.author}` : ""}
                {u.isbn ? ` · ISBN ${u.isbn}` : ""}
              </span>
            </Link>
            <form action={setUnmatchedStatusAction}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="status" value={status === "PENDING" ? "IGNORED" : "PENDING"} />
              <button className="text-xs text-muted underline">{status === "PENDING" ? "E'tiborsiz" : "Navbatga"}</button>
            </form>
          </li>
        ))}
        {!items.length && <li className="px-4 py-6 text-center text-sm text-muted">Hech narsa yo&apos;q.</li>}
      </ul>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="underline">← Oldingi</Link> : <span />}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="underline">Keyingi →</Link> : <span />}
        </div>
      )}
    </>
  );
}
