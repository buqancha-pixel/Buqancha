import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { searchBooks } from "@/lib/books";
import { cleanTitle } from "@/lib/collector/match";
import { formatPrice } from "@/lib/format";
import { linkAsNewEditionAction, linkUnmatchedAction, setUnmatchedStatusAction } from "../../actions";
import { Button, Field, Flash, PageTitle, Section, inputCls, type SP } from "../../ui";

export default async function UnmatchedItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const item = await prisma.unmatchedItem.findUnique({ where: { id }, include: { seller: true } });
  if (!item) notFound();
  const q = (sp.q ?? cleanTitle(item.title)).trim();
  const found = q ? await searchBooks(q, 10) : [];
  const books = found.length
    ? await prisma.book.findMany({ where: { id: { in: found.map((b) => b.id) } }, include: { author: true, editions: true } })
    : [];
  const newParams = new URLSearchParams({ from: item.id });

  return (
    <div>
      <PageTitle back={{ href: "/admin/korib-chiqish?tab=moslanmagan", label: "Ko'rib chiqish" }}>{item.title}</PageTitle>
      <Flash sp={sp} />
      <div className="card mb-5 grid gap-1 p-4 text-sm">
        <p><span className="text-muted">Sotuvchi:</span> {item.seller.name}</p>
        <p><span className="text-muted">Narx:</span> <b className="tabular">{formatPrice(item.price)}</b> {item.inStock ? "" : "(mavjud emas)"}</p>
        {item.author && <p><span className="text-muted">Muallif:</span> {item.author}</p>}
        {item.isbn && <p><span className="text-muted">ISBN:</span> {item.isbn}</p>}
        <p><span className="text-muted">Holati:</span> {item.status === "PENDING" ? "navbatda" : item.status === "IGNORED" ? "e'tiborsiz" : "bog'langan"}</p>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 font-semibold text-accent underline">
            Sotuvchi sahifasini ochish ↗
          </a>
        )}
      </div>

      <Section title="1. Bazadagi kitobga bog'lash">
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Kitob nomi yoki muallifi" className={inputCls} />
          <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
        </form>
        {!books.length && <p className="text-sm text-muted">Mos kitob topilmadi — boshqa so&apos;z bilan qidiring yoki yangi kitob yarating.</p>}
        <ul className="grid gap-3">
          {books.map((b) => (
            <li key={b.id} className="rounded-xl border border-border p-3">
              <Link href={`/admin/kitoblar/${b.id}`} className="font-medium hover:underline">{b.title}</Link>
              <p className="mb-2 text-xs text-muted">{b.author.name}</p>
              <div className="flex flex-wrap gap-2">
                {b.editions.map((e) => (
                  <form key={e.id} action={linkUnmatchedAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="editionId" value={e.id} />
                    <Button variant="ghost" className="h-9 text-xs">
                      → {e.publisher}{e.year ? `, ${e.year}` : ""}{e.isbn ? ` · ${e.isbn}` : ""}
                    </Button>
                  </form>
                ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-accent">Boshqa nashr sifatida qo&apos;shib bog&apos;lash</summary>
                <form action={linkAsNewEditionAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="bookId" value={b.id} />
                  <Field label="Nashriyot" name="publisher" required />
                  <Field label="ISBN" name="isbn" defaultValue={item.isbn ?? ""} />
                  <Field label="Yili" name="year" inputMode="numeric" />
                  <input type="hidden" name="imageSource" value={item.seller.slug} />
                  <Button>Qo&apos;shish va bog&apos;lash</Button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="2. Yoki yangi kitob yaratish">
        <p className="mb-3 text-sm text-muted">Bazada bu kitob umuman yo&apos;q bo&apos;lsa (masalan, diniy kitoblar). Forma shu mahsulot ma&apos;lumotlari bilan to&apos;ldirilgan holda ochiladi.</p>
        <Link href={`/admin/kitoblar/yangi?${newParams}`} className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast">
          Yangi kitob yaratish
        </Link>
      </Section>

      {item.status !== "MATCHED" && (
        <form action={setUnmatchedStatusAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value={item.status === "PENDING" ? "IGNORED" : "PENDING"} />
          <Button variant="ghost">{item.status === "PENDING" ? "E'tiborsiz qoldirish" : "Navbatga qaytarish"}</Button>
        </form>
      )}
    </div>
  );
}
