import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { createBookAction } from "../../actions";
import { Area, Button, Field, Flash, PageTitle, Section, type SP } from "../../ui";
import { EditionFields } from "../forms";

export default async function NewBook({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const [sellers, from] = await Promise.all([
    prisma.seller.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    sp.from ? prisma.unmatchedItem.findUnique({ where: { id: sp.from }, include: { seller: true } }) : null,
  ]);
  return (
    <div>
      <PageTitle back={{ href: "/admin/kitoblar", label: "Kitoblar" }}>Yangi kitob</PageTitle>
      <Flash sp={sp} />
      {from && (
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {from.seller.name}dagi mahsulotdan: <b>{from.title}</b>. Saqlangach, uning narxi shu kitobga bog&apos;lanadi.
        </p>
      )}
      <form action={createBookAction}>
        {from && <input type="hidden" name="from" value={from.id} />}
        <Section title="Kitob">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomi" name="title" required defaultValue={from?.title ?? ""} hint="Lotin yoki kirillda — kirill bo'lsa, lotinga o'zi o'giriladi" className="sm:col-span-2" />
            <Field label="Kirillcha nomi" name="titleCyrl" hint="Ixtiyoriy" />
            <Field label="Muallif" name="author" required defaultValue={from?.author ?? ""} hint="Bazada bo'lsa, o'shanga bog'lanadi" />
            <Area label="Tavsif" name="description" className="sm:col-span-2" placeholder="Kitob haqida 2–3 jumla (o'zingizning so'zlaringiz bilan)" />
          </div>
        </Section>
        <Section title="Nashr">
          <EditionFields sellers={sellers} e={from?.isbn ? { isbn: from.isbn } : undefined} />
        </Section>
        <Button className="w-full sm:w-auto">Kitobni saqlash</Button>
      </form>
    </div>
  );
}
