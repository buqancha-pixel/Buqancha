import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { formatNumber } from "@/lib/format";
import { Flash, PageTitle, type SP } from "./ui";

export default async function AdminHome({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const [books, manual, offers, pending, unmatched, sellers] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { origin: "manual" } }),
    prisma.offer.count({ where: { isSample: false } }),
    prisma.offer.count({ where: { pendingPrice: { not: null } } }),
    prisma.unmatchedItem.count({ where: { status: "PENDING" } }),
    prisma.seller.count(),
  ]);
  const cards: Array<[string, number, string, string]> = [
    ["Kitoblar", books, `${formatNumber(manual)} tasi qo'lda`, "/admin/kitoblar"],
    ["Narxlar", offers, "haqiqiy narxlar", "/admin/kitoblar"],
    ["Keskin o'zgargan narx", pending, "tasdiqlash kerak", "/admin/korib-chiqish"],
    ["Moslanmagan mahsulot", unmatched, "kitobga bog'lanmagan", "/admin/korib-chiqish?tab=moslanmagan"],
    ["Sotuvchilar", sellers, "do'kon va nashriyotlar", "/admin/sotuvchilar"],
  ];
  return (
    <div>
      <PageTitle>Boshqaruv</PageTitle>
      <Flash sp={sp} />
      <Link href="/admin/kitoblar/yangi" className="mb-5 flex h-12 items-center justify-center rounded-full bg-accent font-semibold text-accent-contrast">
        + Yangi kitob qo&apos;shish
      </Link>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, n, sub, href]) => (
          <Link key={label} href={href} className="card p-4 hover:border-accent">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular">{formatNumber(n)}</p>
            <p className="text-xs text-muted">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
