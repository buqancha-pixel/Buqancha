import Link from "next/link";
import { prisma } from "@/lib/db";
import { isForever, partnerActive, requirePartner } from "@/lib/partner/auth";
import { sellerContacts } from "@/lib/contacts";
import { searchBooks } from "@/lib/books";
import { normalizeIsbn } from "@/lib/collector/isbn";
import { LANGUAGE_LABEL, formatDate, formatNumber, formatPrice } from "@/lib/format";
import { addPartnerOffer, createPartnerBook, deletePartnerOffer, partnerLogout, removePartnerPhoto, savePartnerOffer, savePartnerProfile, uploadPartnerFeed, uploadPartnerPhoto } from "./actions";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SellerLogo } from "@/components/SellerLogo";
import { sellerPhotoSrc } from "@/lib/seller/photo";
import { Area, Button, Check, Field, Flash, Section, Select, inputCls } from "../admin/ui";

type SP = Promise<Record<string, string | undefined>>;
const PER_PAGE = 40;

export default async function PartnerHome({ searchParams }: { searchParams: SP }) {
  const seller = await requirePartner();
  const sp = await searchParams;
  const active = partnerActive(seller);
  const n = (sp.n ?? "").trim();
  const page = Math.max(1, Number(sp.sahifa) || 1);
  const qidir = (sp.qidir ?? "").trim();

  const offerWhere = {
    sellerId: seller.id,
    isSample: false,
    ...(n ? { edition: { book: { OR: [{ title: { contains: n, mode: "insensitive" as const } }, { author: { name: { contains: n, mode: "insensitive" as const } } }] } } } : {}),
  };
  const [offers, offerTotal, inStock] = await Promise.all([
    prisma.offer.findMany({
      where: offerWhere,
      include: { edition: { include: { book: { include: { author: true } } } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.offer.count({ where: offerWhere }),
    prisma.offer.count({ where: { sellerId: seller.id, isSample: false, inStock: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(offerTotal / PER_PAGE));
  const back = `/hamkor?${new URLSearchParams({ ...(n ? { n } : {}), ...(page > 1 ? { sahifa: String(page) } : {}) })}#narxlar`;

  // kitob qidirish: ISBN aniq yoki nom/muallif
  let found: Array<{ id: string; slug: string; title: string; author: string; editions: Array<{ id: string; publisher: string; year: number | null; isbn: string | null; language: string | null; mine: number | null }> }> = [];
  if (qidir) {
    const isbn = normalizeIsbn(qidir);
    const ids = isbn
      ? (await prisma.edition.findMany({ where: { isbn }, select: { bookId: true } })).map((e) => e.bookId)
      : (await searchBooks(qidir, 10)).map((b) => b.id);
    const books = await prisma.book.findMany({
      where: { id: { in: ids } },
      include: { author: true, editions: { include: { offers: { where: { sellerId: seller.id }, select: { price: true } } } } },
    });
    found = books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author.name,
      editions: b.editions.map((e) => ({ id: e.id, publisher: e.publisher, year: e.year, isbn: e.isbn, language: e.language, mine: e.offers[0]?.price ?? null })),
    }));
  }

  const hasContact = sellerContacts(seller).length > 0;
  const profile = (
    <>
      <Section title="Logotip yoki do'kon rasmi" id="rasm">
        <div className="flex flex-wrap items-center gap-4">
          <SellerLogo name={seller.name} src={sellerPhotoSrc(seller)} size={96} />
          <div className="grid gap-2">
            {active ? (
              <form action={uploadPartnerPhoto}>
                <PhotoUpload label={seller.photoAt ? "Boshqa rasm yuklash" : "Rasm yuklash"} />
              </form>
            ) : (
              <p className="text-sm text-muted">Kabinet faol bo&apos;lganda yuklash mumkin.</p>
            )}
            {seller.photoAt && active && (
              <form action={removePartnerPhoto}>
                <button className="text-xs text-muted underline">Rasmni olib tashlash</button>
              </form>
            )}
            <p className="max-w-xs text-xs text-muted">Logotip yoki do&apos;kon rasmi (JPG/PNG). Kesilmaydi — butunligicha kvadratga sig&apos;diriladi. Narxlaringiz yonida chiqadi.</p>
          </div>
        </div>
      </Section>
      <Section title="Do'kon ma'lumotlari va aloqa" id="malumot">
        <form action={savePartnerProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Do'kon nomi (saytda ko'rinadi)" name="name" defaultValue={seller.name} required maxLength={80} className="sm:col-span-2" />
          <p className="text-sm text-muted sm:col-span-2">
            <b className="text-text">Xaridor qanday buyurtma beradi?</b> Kitob narxi yonida &quot;Buyurtma berish&quot; tugmasi chiqadi — bosilganda shu yerga
            yozgan aloqalaringiz ko&apos;rinadi. Qaysi biri qulay bo&apos;lsa, o&apos;shani yozing (kamida bittasi).
          </p>
          <Field label="Telefon" name="phone" type="tel" defaultValue={seller.phone ?? ""} placeholder="+998 90 123 45 67" />
          <Field label="Telegram" name="telegram" defaultValue={seller.telegram ? `@${seller.telegram}` : ""} placeholder="@kitob_dokonim" />
          <Field label="Instagram" name="instagram" defaultValue={seller.instagram ? `@${seller.instagram}` : ""} placeholder="@kitob_dokonim" />
          <Field label="Sayt (bo'lsa)" name="website" type="url" defaultValue={seller.website ?? ""} placeholder="https://" />
          <Field label="Shahar (ixtiyoriy)" name="city" defaultValue={seller.city} placeholder="Onlayn" hint="Butun O'zbekiston bo'ylab yetkazsangiz — Onlayn" />
          <Field label="Manzil (do'koningiz bo'lsa)" name="address" defaultValue={seller.address ?? ""} />
          <Field
            label="Xaritadagi joylashuv (do'koningiz bo'lsa)"
            name="location"
            defaultValue={seller.lat != null && seller.lng != null ? `${seller.lat}, ${seller.lng}` : ""}
            placeholder="41.311081, 69.240562"
            hint="Google Maps'da do'koningiz ustiga barmoqni bosib turing — chiqqan raqamlarni nusxalang"
            className="sm:col-span-2"
          />
          <Area label="Qisqacha (500 belgigacha): yetkazib berish, to'lov, ish vaqti" name="description" defaultValue={seller.description ?? ""} className="sm:col-span-2" />
          <Button disabled={!active} className="w-fit">Saqlash</Button>
        </form>
      </Section>
    </>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Hamkor kabineti</p>
          <h1 className="text-2xl sm:text-3xl">{seller.name}</h1>
          <p className={`mt-1 text-sm font-semibold ${active ? "text-accent" : "text-warn-text"}`}>
            {active
              ? isForever(seller.partnerUntil)
                ? "Faol — muddatsiz"
                : `Faol — ${formatDate(seller.partnerUntil!)} gacha`
              : "Muddati tugagan — narxlaringiz saytda qoladi, lekin o'zgartirib bo'lmaydi"}
          </p>
        </div>
        <form action={partnerLogout}>
          <button className="text-sm text-muted underline">Chiqish</button>
        </form>
      </div>
      <Flash sp={sp} />
      <details open={!hasContact || offerTotal === 0} className="card mb-5 p-4 text-sm [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none font-semibold">📖 Kabinet qanday ishlaydi?</summary>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-muted">
          <li><b className="text-text">Aloqa</b> — &quot;Do&apos;kon ma&apos;lumotlari va aloqa&quot; bo&apos;limida telefon, Telegram yoki Instagram&apos;ingizni yozing. Xaridor shu orqali buyurtma beradi.</li>
          <li><b className="text-text">Kitob qo&apos;shish</b> — &quot;Qo&apos;shish&quot; bo&apos;limida kitob nomi yoki ISBN&apos;ni qidiring, narxini yozib &quot;Qo&apos;shish&quot;ni bosing.</li>
          <li><b className="text-text">Ko&apos;p kitob bo&apos;lsa</b> — &quot;Fayl&quot; bo&apos;limidagi Excel namunani yuklab oling, to&apos;ldirib, bitta fayl bilan yuklang.</li>
          <li><b className="text-text">Saytda yo&apos;q kitob</b> — &quot;Yangi kitob&quot; bo&apos;limida ISBN, nom va muallif bilan qo&apos;shasiz.</li>
          <li><b className="text-text">Narx o&apos;zgarsa yoki tugasa</b> — &quot;Narxlar&quot; ro&apos;yxatida yangilang yoki &quot;sotuvda yo&apos;q&quot; deb belgilang.</li>
        </ol>
        <p className="mt-3 text-muted">Bu havola parol o&apos;rnida — uni hech kimga bermang.</p>
      </details>
      {!hasContact && (
        <p className="mb-5 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text">
          Avval aloqa ma&apos;lumotini kiriting — busiz xaridor sizga buyurtma bera olmaydi.
        </p>
      )}
      {!hasContact && profile}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-muted">Narxlaringiz</p><p className="text-2xl font-semibold tabular">{formatNumber(offerTotal)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Sotuvda</p><p className="text-2xl font-semibold tabular">{formatNumber(inStock)}</p></div>
        <div className="card col-span-2 p-4 text-sm sm:col-span-1">
          <p className="text-xs text-muted">Bo&apos;limlar</p>
          <p className="mt-1 flex flex-wrap gap-x-3"><a href="#qoshish" className="underline">Qo&apos;shish</a><a href="#fayl" className="underline">Fayl</a><a href="#narxlar" className="underline">Narxlar</a><a href="#malumot" className="underline">Ma&apos;lumot</a></p>
        </div>
      </div>
      {!active && (
        <p className="mb-5 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-text">
          Kabinetni uzaytirish uchun Buqanchaga yozing. Muddat tugaganda narxlaringiz o&apos;chmaydi, faqat &quot;Hamkor&quot; belgisi va tahrirlash yopiladi.
        </p>
      )}

      <Section title="Kitob qo'shish" id="qoshish">
        <form className="mb-4 flex gap-2" action="/hamkor#qoshish">
          <input name="qidir" defaultValue={qidir} placeholder="ISBN yoki kitob nomi" className={inputCls} />
          <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
        </form>
        {qidir && !found.length && <p className="text-sm text-muted">Topilmadi — pastdagi &quot;Bazada yo&apos;q kitob&quot; formasidan qo&apos;shing.</p>}
        <ul className="grid gap-3">
          {found.map((b) => (
            <li key={b.id} className="rounded-xl border border-border p-3">
              <Link href={`/kitob/${b.slug}`} target="_blank" className="font-medium hover:underline">{b.title}</Link>
              <p className="mb-2 text-xs text-muted">{b.author}</p>
              {b.editions.map((e) => (
                <form key={e.id} action={addPartnerOffer} className="mt-2 grid gap-2 rounded-lg bg-surface-2 p-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                  <input type="hidden" name="editionId" value={e.id} />
                  <p className="text-xs">
                    {e.publisher}{e.year ? `, ${e.year}` : ""}{e.isbn ? ` · ISBN ${e.isbn}` : ""}{e.language && LANGUAGE_LABEL[e.language] ? ` · ${LANGUAGE_LABEL[e.language]}` : ""}
                    {e.mine != null && <b className="ml-1 text-accent">· sizdagi narx: {formatPrice(e.mine)}</b>}
                  </p>
                  <input name="price" required inputMode="numeric" placeholder="Narx, so'm" aria-label="Narx" className="h-10 rounded-full border border-border bg-bg px-3 text-sm" />
                  <button disabled={!active} className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-accent-contrast disabled:opacity-50">
                    {e.mine != null ? "Yangilash" : "Qo'shish"}
                  </button>
                  <input name="url" type="url" placeholder="Saytingizdagi sahifa (ixtiyoriy)" aria-label="Havola" className="h-10 rounded-full border border-border bg-bg px-3 text-sm sm:col-span-3" />
                </form>
              ))}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Bazada yo'q kitob" id="yangi">
        <form action={createPartnerBook} className="grid gap-4 sm:grid-cols-2">
          <Field label="Kitob nomi" name="title" required className="sm:col-span-2" />
          <Field label="Muallif" name="author" required />
          <Field label="ISBN" name="isbn" required inputMode="numeric" hint="Orqa muqovadagi shtrix-kod ostida (978...)" />
          <Field label="Nashriyot" name="publisher" required />
          <Field label="Yili" name="year" inputMode="numeric" />
          <Select label="Tili" name="language" defaultValue="">
            <option value="">O&apos;zbekcha</option>
            {Object.entries(LANGUAGE_LABEL).map(([c, l]) => (
              <option key={c} value={c}>{l}</option>
            ))}
          </Select>
          <Field label="Narx (so'm)" name="price" required inputMode="numeric" />
          <Field label="Saytingizdagi sahifa" name="url" type="url" className="sm:col-span-2" />
          <Button disabled={!active} className="w-fit">Kitobni qo&apos;shish</Button>
        </form>
      </Section>

      <Section title="Butun ro'yxatni bitta fayl bilan yuklash" id="fayl">
        <p className="mb-2 text-sm">
          Kitoblarni bittalab kiritish shart emas: <b>Excel (.xlsx)</b> yoki <b>Word (.docx) jadvali</b> yuklang — barchasi bir
          yo&apos;la qo&apos;shiladi. Bazada yo&apos;q kitoblar ham (ISBN va muallif yozilgan bo&apos;lsa) avtomatik yaratiladi.
        </p>
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            <a href="/buqancha-namuna.xlsx" download className="font-semibold text-accent underline">Excel shablonni yuklab oling</a> (yoki o&apos;z jadvalingizdan foydalaning).
          </li>
          <li>
            Ustunlar: <b>Kitob nomi, Muallif, ISBN, Nashriyot, Narx (so&apos;m), Mavjud (ha/yo&apos;q), Havola</b>. Majburiy — nom va narx; ISBN bo&apos;lsa, kitob aniq topiladi.
          </li>
          <li>Faylni shu yerga yuklang. Keyinchalik narxlar o&apos;zgarsa — o&apos;sha faylni yangilab qayta yuklang.</li>
        </ol>
        <form action={uploadPartnerFeed} className="grid gap-3">
          <input type="file" name="file" accept=".xlsx,.docx,.csv,.txt,.json" required className="text-sm" />
          <Check label="Bu to'liq ro'yxat — faylda yo'q kitoblarim &quot;sotuvda yo'q&quot; bo'lsin" name="full" />
          <Button disabled={!active} className="w-fit">Yuklash</Button>
        </form>
        <p className="mt-2 text-xs text-muted">4 MB gacha (bir necha ming kitob). Diniy adabiyot fayldan qo&apos;shilmaydi — Buqanchaga yozing.</p>
      </Section>

      <Section title={`Narxlaringiz (${formatNumber(offerTotal)})`} id="narxlar">
        <form className="mb-3 flex gap-2" action="/hamkor#narxlar">
          <input name="n" defaultValue={n} placeholder="Nom yoki muallif bo'yicha" className={inputCls} />
          <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Izlash</button>
        </form>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {offers.map((o) => (
            <li key={o.id} className="p-3">
              <p className="truncate text-sm font-medium">{o.edition.book.title}</p>
              <p className="truncate text-xs text-muted">{o.edition.book.author.name} · {o.edition.publisher}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <form action={savePartnerOffer} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="back" value={back} />
                  <input type="hidden" name="url" value={o.url ?? ""} />
                  <input name="price" defaultValue={o.price} inputMode="numeric" aria-label="Narx" className="h-10 w-28 rounded-full border border-border bg-surface-2 px-3 text-sm tabular" />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="inStock" defaultChecked={o.inStock} className="h-4 w-4" /> sotuvda
                  </label>
                  <button disabled={!active} className="h-10 rounded-full bg-accent px-4 text-xs font-semibold text-accent-contrast disabled:opacity-50">Saqlash</button>
                </form>
                <form action={deletePartnerOffer}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="back" value={back} />
                  <button disabled={!active} className="text-xs text-muted underline disabled:opacity-50">O&apos;chirish</button>
                </form>
              </div>
            </li>
          ))}
          {!offers.length && <li className="p-4 text-center text-sm text-muted">Hali narx yo&apos;q — yuqoridan kitob qo&apos;shing yoki fayl yuklang.</li>}
        </ul>
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={`/hamkor?${new URLSearchParams({ ...(n ? { n } : {}), sahifa: String(page - 1) })}#narxlar`} className="underline">← Oldingi</Link> : <span />}
            <span className="text-muted">{page} / {pages}</span>
            {page < pages ? <Link href={`/hamkor?${new URLSearchParams({ ...(n ? { n } : {}), sahifa: String(page + 1) })}#narxlar`} className="underline">Keyingi →</Link> : <span />}
          </div>
        )}
      </Section>

      {hasContact && profile}
    </div>
  );
}
