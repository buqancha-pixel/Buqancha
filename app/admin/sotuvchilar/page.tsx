import Link from "next/link";
import type { Prisma, SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { SELLER_TYPE_LABEL, SELLER_TYPE_PARAM, SELLER_TYPE_PLURAL, formatNumber } from "@/lib/format";
import { bulkDeleteSellersAction, quickPartnerAction } from "../actions";
import { PARTNER_TERMS, isForever } from "@/lib/partner/auth";
import { Flash, PageTitle, type SP } from "../ui";
import { SelectAllSellers } from "./SelectAll";

export default async function AdminSellers({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const tur: SellerType | undefined = sp.tur ? SELLER_TYPE_PARAM[sp.tur] : undefined;
  const narxsiz = sp.narxsiz === "1";
  const where: Prisma.SellerWhereInput = { ...(tur ? { type: tur } : {}), ...(narxsiz ? { offers: { none: { isSample: false } } } : {}) };
  const [sellers, typeCounts] = await Promise.all([
    prisma.seller.findMany({
      where,
      orderBy: [{ offers: { _count: "desc" } }, { name: "asc" }],
      include: { _count: { select: { offers: { where: { isSample: false } } } } },
    }),
    prisma.seller.groupBy({ by: ["type"], _count: true }),
  ]);
  const count = (t: SellerType) => typeCounts.find((x) => x.type === t)?._count ?? 0;
  const total = typeCounts.reduce((a, x) => a + x._count, 0);
  const qs = (p: { tur?: string | null; narxsiz?: boolean }) => {
    const q = new URLSearchParams();
    const t = p.tur === undefined ? sp.tur : p.tur;
    const n = p.narxsiz ?? narxsiz;
    if (t) q.set("tur", t);
    if (n) q.set("narxsiz", "1");
    const s = q.toString();
    return s ? `/admin/sotuvchilar?${s}` : "/admin/sotuvchilar";
  };
  const chip = (active: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-sm ${active ? "bg-text text-bg" : "border border-border"}`;

  return (
    <div>
      <PageTitle>Sotuvchilar</PageTitle>
      <Flash sp={sp} />
      <form action={quickPartnerAction} className="card mb-4 grid gap-3 p-4">
        <div>
          <h2 className="text-lg font-semibold">Do&apos;konga kabinet ochish</h2>
          <p className="text-sm text-muted">Faqat nomini yozing — telefon, Telegram, kitoblar va narxlarni do&apos;kon o&apos;zi kabinetda kiritadi.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input name="name" required minLength={2} maxLength={80} placeholder="Do'kon nomi" aria-label="Do'kon nomi" className="h-11 rounded-full border border-border bg-surface-2 px-4 text-sm" />
          <select name="type" defaultValue="ONLINE" aria-label="Turi" className="h-11 rounded-full border border-border bg-surface-2 px-3 text-sm">
            <option value="ONLINE">Onlayn do&apos;kon</option>
            <option value="STORE">Do&apos;kon</option>
            <option value="PUBLISHER">Nashriyot</option>
          </select>
          <select name="term" defaultValue="30" aria-label="Muddat" className="h-11 rounded-full border border-border bg-surface-2 px-3 text-sm">
            {PARTNER_TERMS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <button className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast">Ochish</button>
        </div>
      </form>
      <Link href="/admin/sotuvchilar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + To&apos;liq ma&apos;lumot bilan sotuvchi qo&apos;shish
      </Link>

      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={qs({ tur: null })} className={chip(!tur)}>Hammasi {total}</Link>
        {Object.entries(SELLER_TYPE_PARAM).map(([p, t]) => (
          <Link key={p} href={qs({ tur: p })} className={chip(tur === t)}>
            {SELLER_TYPE_PLURAL[t]} {count(t)}
          </Link>
        ))}
      </div>
      <Link href={qs({ narxsiz: !narxsiz })} className={`mb-4 inline-block ${chip(narxsiz)}`}>
        {narxsiz ? "✓ " : ""}Faqat narxi yo&apos;qlar
      </Link>

      <form action={bulkDeleteSellersAction}>
        <input type="hidden" name="back" value={qs({})} />
        <ul className="card divide-y divide-border">
          {sellers.map((s) => (
            <li key={s.id} className="flex items-center gap-3 pl-3">
              <input type="checkbox" name="ids" value={s.id} aria-label={`${s.name} — belgilash`} className="h-5 w-5 shrink-0" />
              <Link href={`/admin/sotuvchilar/${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-4 hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {SELLER_TYPE_LABEL[s.type]} · {s.city}
                    {s.collector !== "NONE" ? " · narxlar avtomatik" : ""}
                    {s.partnerUntil && s.partnerUntil > new Date() ? (isForever(s.partnerUntil) ? " · hamkor (muddatsiz)" : " · hamkor") : s.partnerTokenHash ? " · hamkorlik muddati tugagan" : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-sm tabular ${s._count.offers ? "text-muted" : "text-warn-text"}`}>
                  {s._count.offers ? `${formatNumber(s._count.offers)} narx` : "narx yo'q"}
                </span>
              </Link>
            </li>
          ))}
          {!sellers.length && <li className="px-4 py-6 text-center text-sm text-muted">Hech kim yo&apos;q.</li>}
        </ul>

        {sellers.length > 0 && (
          <div className="sticky bottom-3 z-10 mt-3 grid gap-2 rounded-2xl border border-border bg-bg p-3 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <SelectAllSellers />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="confirm" value="ha" className="h-5 w-5" />
                Ha, belgilanganlar barcha narxlari bilan o&apos;chirilsin
              </label>
            </div>
            <button className="h-10 w-fit rounded-full bg-red-600 px-4 text-sm font-semibold text-white">Belgilanganlarni o&apos;chirish</button>
            <p className="text-xs text-muted">Kitoblar o&apos;chmaydi — faqat shu sotuvchilarning narxlari. O&apos;chirilgan sotuvchi sinxronlashda qayta qo&apos;shilmaydi.</p>
          </div>
        )}
      </form>
    </div>
  );
}
