import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { Flash, PageTitle, type SP } from "../ui";
import { promoterLinkAction } from "../actions";

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
          <li key={p.id} className="flex items-center gap-2 pr-3">
            <Link href={`/admin/targibotchilar/${p.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  @{p.instagram} · {p._count.books} ta kitob ·{" "}
                  {!p.consent ? <b className="text-warn-text">rozilik olinmagan — saytda ko&apos;rinmaydi</b> : p.active ? "saytda" : "yashirilgan"}
                  {p.tokenHash ? " · kabinet ochiq" : ""}
                </span>
              </span>
            </Link>
            {!p.tokenHash && (
              <form action={promoterLinkAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="h-9 shrink-0 rounded-full bg-accent px-3 text-xs font-semibold text-accent-contrast">Kabinet ochish</button>
              </form>
            )}
          </li>
        ))}
        {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">Hali hech kim yo&apos;q.</li>}
      </ul>
    </div>
  );
}
