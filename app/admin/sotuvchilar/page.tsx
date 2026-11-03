import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { SELLER_TYPE_LABEL, formatNumber } from "@/lib/format";
import { Flash, PageTitle, type SP } from "../ui";

export default async function AdminSellers({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const sellers = await prisma.seller.findMany({
    orderBy: [{ offers: { _count: "desc" } }, { name: "asc" }],
    include: { _count: { select: { offers: true } } },
  });
  return (
    <div>
      <PageTitle>Sotuvchilar</PageTitle>
      <Flash sp={sp} />
      <Link href="/admin/sotuvchilar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + Yangi sotuvchi
      </Link>
      <ul className="card divide-y divide-border">
        {sellers.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/sotuvchilar/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-xs text-muted">
                  {SELLER_TYPE_LABEL[s.type]} · {s.city}
                  {s.collector !== "NONE" ? " · narxlar avtomatik" : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular text-muted">{formatNumber(s._count.offers)} narx</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
