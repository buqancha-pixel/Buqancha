import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { formatPrice, formatRelative, SOURCE_LABEL } from "@/lib/format";
import {
  addEditionAction, deleteBookAction, deleteEditionAction, deleteOfferAction, saveOfferAction,
  updateAuthorAction, updateBookAction, updateEditionAction,
} from "../../actions";
import { Area, Button, Check, Field, Flash, PageTitle, Section, Select, type SP } from "../../ui";
import { EditionFields } from "../forms";

export default async function EditBook({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [book, sellers] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      include: {
        author: { include: { _count: { select: { books: true } } } },
        editions: { orderBy: { year: "desc" }, include: { offers: { include: { seller: true }, orderBy: { price: "asc" } } } },
      },
    }),
    prisma.seller.findMany({ orderBy: [{ offers: { _count: "desc" } }, { name: "asc" }], select: { id: true, slug: true, name: true } }),
  ]);
  if (!book) notFound();

  return (
    <div>
      <PageTitle back={{ href: "/admin/kitoblar", label: "Kitoblar" }}>{book.title}</PageTitle>
      <Flash sp={sp} />
      <p className="mb-5 text-sm">
        <Link href={`/kitob/${book.slug}`} className="text-accent underline" target="_blank">
          Saytda ko&apos;rish ↗
        </Link>
        <span className="ml-2 text-muted">{book.origin === "manual" ? "· qo'lda boshqariladi" : "· avtomatik import qilingan"}</span>
      </p>

      <form action={updateBookAction}>
        <input type="hidden" name="id" value={book.id} />
        <Section title="Kitob">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomi" name="title" defaultValue={book.title} required className="sm:col-span-2" />
            <Field label="Kirillcha nomi" name="titleCyrl" defaultValue={book.titleCyrl ?? ""} />
            <Field label="Muallif" name="author" defaultValue={book.author.name} required hint="Boshqa muallifga o'tkazish uchun ismini yozing" />
            <Area label="Tavsif" name="description" defaultValue={book.description} className="sm:col-span-2" />
          </div>
          <Button className="mt-4">Saqlash</Button>
        </Section>
      </form>

      <div id="nashrlar" className="scroll-mt-24">
        {book.editions.map((e, i) => (
          <Section key={e.id} title={`Nashr ${i + 1}: ${e.publisher}${e.year ? `, ${e.year}` : ""}`}>
            <h3 className="mb-2 text-sm font-semibold">Narxlar</h3>
            <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
              {e.offers.map((o) => (
                <li key={o.id} className="px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{o.seller.name}</span>
                    <span className="tabular font-semibold">
                      {formatPrice(o.price)}
                      {o.pendingPrice != null && <span className="ml-2 text-warn-text">→ {formatPrice(o.pendingPrice)}?</span>}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {o.isSample ? "namunaviy · " : ""}
                    {SOURCE_LABEL[o.source]} · {o.inStock ? "mavjud" : "mavjud emas"} · {formatRelative(o.checkedAt ?? o.updatedAt)}
                    {o.url && (
                      <>
                        {" · "}
                        <a href={o.url} target="_blank" rel="noopener noreferrer" className="underline">havola</a>
                      </>
                    )}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-accent">Tahrirlash</summary>
                    <form action={saveOfferAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="bookId" value={book.id} />
                      <input type="hidden" name="editionId" value={e.id} />
                      <input type="hidden" name="sellerId" value={o.sellerId} />
                      <Field label="Narx (so'm)" name="price" defaultValue={o.price} inputMode="numeric" required />
                      <Field label="Havola" name="url" defaultValue={o.url ?? ""} type="url" />
                      <Check label="Sotuvda mavjud" name="inStock" defaultChecked={o.inStock} />
                      <Button>Saqlash</Button>
                    </form>
                    <form action={deleteOfferAction} className="mt-2">
                      <input type="hidden" name="bookId" value={book.id} />
                      <input type="hidden" name="id" value={o.id} />
                      <Button variant="danger" className="h-9 text-xs">Narxni o&apos;chirish</Button>
                    </form>
                  </details>
                </li>
              ))}
              {!e.offers.length && <li className="px-3 py-3 text-sm text-muted">Hali narx yo&apos;q.</li>}
            </ul>

            <details className="mb-3 rounded-xl border border-border p-3" open={!e.offers.length}>
              <summary className="cursor-pointer text-sm font-semibold">+ Narx qo&apos;shish</summary>
              <form action={saveOfferAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="bookId" value={book.id} />
                <input type="hidden" name="editionId" value={e.id} />
                <Select label="Sotuvchi" name="sellerId" required defaultValue="">
                  <option value="" disabled>Tanlang</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Field label="Narx (so'm)" name="price" required inputMode="numeric" placeholder="39 000" />
                <Field label="Kitob sahifasi havolasi" name="url" type="url" placeholder="https://…" className="sm:col-span-2"
                  hint="Qamar, Barakot kabi sotuvchilarda havola bo'lsa, narx har kecha o'zi yangilanadi" />
                <Check label="Sotuvda mavjud" name="inStock" defaultChecked />
                <Button>Narxni saqlash</Button>
              </form>
            </details>

            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Nashr ma&apos;lumotlari</summary>
              <form action={updateEditionAction} className="mt-3">
                <input type="hidden" name="bookId" value={book.id} />
                <input type="hidden" name="id" value={e.id} />
                <EditionFields e={e} sellers={sellers} prefix={`e${i}-`} />
                <Button className="mt-4">Nashrni saqlash</Button>
              </form>
              {book.editions.length > 1 && (
                <form action={deleteEditionAction} className="mt-3">
                  <input type="hidden" name="bookId" value={book.id} />
                  <input type="hidden" name="id" value={e.id} />
                  <Button variant="danger" className="h-9 text-xs">Nashrni o&apos;chirish (narxlari bilan)</Button>
                </form>
              )}
            </details>
          </Section>
        ))}

        <Section title="+ Yangi nashr">
          <details>
            <summary className="cursor-pointer text-sm text-muted">Boshqa nashriyot yoki boshqa yildagi nashr bo&apos;lsa</summary>
            <form action={addEditionAction} className="mt-4">
              <input type="hidden" name="bookId" value={book.id} />
              <EditionFields sellers={sellers} prefix="new-" />
              <Button className="mt-4">Nashrni qo&apos;shish</Button>
            </form>
          </details>
        </Section>
      </div>

      <Section title={`Muallif: ${book.author.name}`}>
        <details>
          <summary className="cursor-pointer text-sm text-muted">
            Muallif ma&apos;lumotlari ({book.author._count.books} ta kitobida ko&apos;rinadi)
          </summary>
          <form action={updateAuthorAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={book.author.id} />
            <input type="hidden" name="bookId" value={book.id} />
            <Field label="Ismi" name="name" defaultValue={book.author.name} required />
            <Field label="Kirillcha" name="nameCyrl" defaultValue={book.author.nameCyrl ?? ""} />
            <Field label="Tug'ilgan yili" name="birthYear" defaultValue={book.author.birthYear ?? ""} inputMode="numeric" />
            <Field label="Vafot etgan yili" name="deathYear" defaultValue={book.author.deathYear ?? ""} inputMode="numeric" />
            <Area label="Qisqacha ma'lumot" name="bio" defaultValue={book.author.bio ?? ""} className="sm:col-span-2" />
            <Button>Muallifni saqlash</Button>
          </form>
        </details>
      </Section>

      <Section title="Kitobni o'chirish">
        <form action={deleteBookAction} className="grid gap-3">
          <input type="hidden" name="id" value={book.id} />
          <Check label="Ha, kitob barcha nashr va narxlari bilan o'chirilsin" name="confirm" value="ha" />
          <Button variant="danger" className="w-fit">O&apos;chirish</Button>
        </form>
      </Section>
    </div>
  );
}
