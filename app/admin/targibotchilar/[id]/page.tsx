import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { searchBooks } from "@/lib/books";
import { addPromoterBookAction, deletePromoterAction, removePromoterBookAction, savePromoterAction } from "../../actions";
import { Area, Button, Check, Field, Flash, PageTitle, Section, inputCls, type SP } from "../../ui";

export default async function EditPromoter({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "yangi";
  const p = isNew
    ? null
    : await prisma.promoter.findUnique({ where: { id }, include: { books: { orderBy: { createdAt: "desc" }, include: { book: { include: { author: true } } } } } });
  if (!isNew && !p) notFound();
  const q = (sp.q ?? "").trim();
  const found = p && q ? (await searchBooks(q, 12)).filter((b) => !p.books.some((pb) => pb.bookId === b.id)) : [];

  return (
    <div>
      <PageTitle back={{ href: "/admin/targibotchilar", label: "Targ'ibotchilar" }}>{p?.name ?? "Yangi targ'ibotchi"}</PageTitle>
      <Flash sp={sp} />
      {p && (
        <p className="mb-4 text-sm">
          <Link href={`/targibotchilar/${p.slug}`} target="_blank" className="text-accent underline">Saytda ko&apos;rish ↗</Link>
        </p>
      )}
      <form action={savePromoterAction}>
        {p && <input type="hidden" name="id" value={p.id} />}
        <Section title="Ma'lumotlar">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism (sahifada ko'rinadi)" name="name" defaultValue={p?.name ?? ""} required />
            <Field label="Instagram username" name="instagram" defaultValue={p?.instagram ?? ""} required placeholder="kitobxon_qiz" hint="@ belgisisiz yoki profil havolasi" />
            <Field label="Obunachilar" name="followers" defaultValue={p?.followers ?? ""} placeholder="25 ming" />
            <Field label="Tartib raqami" name="position" type="number" defaultValue={p?.position ?? 0} hint="Kichigi oldinda" />
            <Field label="Rasm havolasi (ixtiyoriy)" name="photoUrl" type="url" defaultValue={p?.photoUrl ?? ""} className="sm:col-span-2" hint="Bo'lmasa ism bosh harflari ko'rsatiladi" />
            <Area label="Qisqacha (600 belgigacha)" name="about" defaultValue={p?.about ?? ""} className="sm:col-span-2" placeholder="Qanday kitoblar haqida yozadi, nimasi bilan qiziq" />
            <div className="grid gap-2 sm:col-span-2">
              <Check label="Bloger roziligi olindi (belgilanmasa saytda ko'rinmaydi)" name="consent" defaultChecked={p?.consent ?? false} />
              <Check label="Saytda ko'rsatish" name="active" defaultChecked={p?.active ?? true} />
            </div>
          </div>
          <Button className="mt-4">Saqlash</Button>
        </Section>
      </form>

      {p && (
        <Section title={`Tavsiya qilgan kitoblari (${p.books.length})`} id="kitoblar">
          <form className="mb-3 flex gap-2" action={`/admin/targibotchilar/${p.id}#kitoblar`}>
            <input name="q" defaultValue={q} placeholder="Kitob nomi yoki muallif" className={inputCls} />
            <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
          </form>
          {q && !found.length && <p className="mb-3 text-sm text-muted">Topilmadi.</p>}
          <ul className="mb-4 grid gap-2">
            {found.map((b) => (
              <li key={b.id}>
                <form action={addPromoterBookAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="bookId" value={b.id} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <b>{b.title}</b> <span className="text-muted">· {b.author.name}</span>
                  </span>
                  <input name="note" placeholder="Izoh (ixtiyoriy)" aria-label="Izoh" className="h-9 w-40 rounded-full border border-border bg-bg px-3 text-xs" />
                  <Button className="h-9 text-xs">+ Qo&apos;shish</Button>
                </form>
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {p.books.map((pb) => (
              <li key={pb.bookId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {pb.book.title} <span className="text-muted">· {pb.book.author.name}</span>
                  {pb.note && <span className="text-muted italic"> — “{pb.note}”</span>}
                </span>
                <form action={removePromoterBookAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="bookId" value={pb.bookId} />
                  <button className="text-xs text-muted underline">Olib tashlash</button>
                </form>
              </li>
            ))}
            {!p.books.length && <li className="px-3 py-4 text-center text-sm text-muted">Hali kitob yo&apos;q — yuqoridan qidirib qo&apos;shing.</li>}
          </ul>
        </Section>
      )}

      {p && (
        <Section title="O'chirish">
          <form action={deletePromoterAction} className="grid gap-3">
            <input type="hidden" name="id" value={p.id} />
            <Check label="Ha, targ'ibotchi o'chirilsin" name="confirm" value="ha" />
            <Button variant="danger" className="w-fit">O&apos;chirish</Button>
          </form>
        </Section>
      )}
    </div>
  );
}
