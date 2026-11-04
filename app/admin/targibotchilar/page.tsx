import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { Flash, PageTitle, type SP } from "../ui";

export default async function AdminPromoters({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const list = await prisma.promoter.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], include: { _count: { select: { books: true } } } });
  return (
    <div>
      <PageTitle>Kitob targ&apos;ibotchilari</PageTitle>
      <Flash sp={sp} />
      <Link href="/admin/targibotchilar/yangi" className="mb-4 inline-block text-sm font-semibold text-accent underline">
        + Yangi targ&apos;ibotchi
      </Link>
      <ul className="card divide-y divide-border">
        {list.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/targibotchilar/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  @{p.instagram} · {p._count.books} ta kitob ·{" "}
                  {!p.consent ? <b className="text-warn-text">rozilik olinmagan — saytda ko&apos;rinmaydi</b> : p.active ? "saytda" : "yashirilgan"}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">Hali hech kim yo&apos;q.</li>}
      </ul>
    </div>
  );
}
