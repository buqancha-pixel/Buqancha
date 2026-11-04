import Link from "next/link";
import { prisma } from "@/lib/db";
import { searchBooks } from "@/lib/books";
import { requirePromoter } from "@/lib/promoter/auth";
import { avatarColor } from "@/lib/promoters";
import { SITE_URL } from "@/lib/site";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { addPromoterRecommendation, promoterLogout, removePromoterRecommendation, savePromoterProfile, updatePromoterNote } from "./actions";
import { Area, Button, Field, Flash, Section, inputCls } from "../admin/ui";

type SP = Promise<{ q?: string; ok?: string; xato?: string }>;

export default async function PromoterCabinet({ searchParams }: { searchParams: SP }) {
  const me = await requirePromoter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const recs = await prisma.promoterBook.findMany({
    where: { promoterId: me.id },
    orderBy: { createdAt: "desc" },
    include: { book: { select: { id: true, slug: true, title: true, author: { select: { name: true } } } } },
  });
  const have = new Set(recs.map((r) => r.bookId));
  const found = q ? (await searchBooks(q, 15)).filter((b) => !have.has(b.id)) : [];
  const visible = me.consent && me.active;

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <PromoterAvatar name={me.name} photoUrl={me.photoUrl} color={avatarColor(me.name)} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl">{me.name}</h1>
          <p className="text-sm text-muted">
            @{me.instagram} ·{" "}
            {visible ? (
              <Link href={`/targibotchilar/${me.slug}`} target="_blank" className="text-accent underline">
                Saytdagi sahifam ↗
              </Link>
            ) : (
              <span>sahifangiz hali saytda ko&apos;rinmaydi</span>
            )}
          </p>
        </div>
        <form action={promoterLogout}>
          <button className="text-sm text-muted underline">Chiqish</button>
        </form>
      </div>
      <Flash sp={sp} />

      <details open={recs.length === 0} className="card mb-6 p-4 text-sm [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none font-semibold">📖 Kabinet qanday ishlaydi?</summary>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-muted">
          <li><b className="text-text">Kitob qidiring</b> — pastdagi &quot;Kitob tavsiya qilish&quot; qatoriga kitob nomi yoki muallifini yozib, &quot;Qidirish&quot;ni bosing.</li>
          <li><b className="text-text">Izoh yozing</b> — kitob yonidagi qatorga 1–2 gap: nega o&apos;qish kerak, kimga yoqadi. Ixtiyoriy, lekin izohli tavsiya ko&apos;proq o&apos;qiladi.</li>
          <li><b className="text-text">&quot;+ Tavsiya qilish&quot;</b> ni bosing — kitob sahifangizda chiqadi, kitobning o&apos;z sahifasida esa &quot;Tavsiya qiladi: @{me.instagram}&quot; bo&apos;lib ko&apos;rinadi.</li>
          <li><b className="text-text">Tavsiyalarim</b> — izohni o&apos;zgartirib &quot;Saqlash&quot;ni bosing yoki kitobni &quot;Olib tashlash&quot; mumkin.</li>
          <li><b className="text-text">Sahifamdagi ma&apos;lumot</b> — ismingiz, o&apos;zingiz haqingizda qisqacha va obunachilar soni sahifangiz tepasida chiqadi.</li>
        </ol>
        <p className="mt-3 text-muted">
          Kitob saytda topilmasa, nomini Buqanchaga yozing — qo&apos;shib beramiz. Bu havola parol o&apos;rnida: uni hech kimga bermang.
          Instagram&apos;da sahifangiz havolasini ulashishingiz mumkin
          {visible ? <>: <Link href={`/targibotchilar/${me.slug}`} className="text-accent underline">{SITE_URL.replace(/^https?:\/\//, "")}/targibotchilar/{me.slug}</Link></> : null}.
        </p>
      </details>

      <Section title="Kitob tavsiya qilish" id="qoshish">
        <form className="mb-3 flex gap-2" action="/bloger#qoshish">
          <input name="q" defaultValue={q} placeholder="Kitob nomi yoki muallif" className={inputCls} />
          <button className="h-11 shrink-0 rounded-full border border-border bg-surface-2 px-4 text-sm font-semibold">Qidirish</button>
        </form>
        {q && !found.length && (
          <p className="text-sm text-muted">Topilmadi. Kitob saytda bo&apos;lmasa, nomini Buqanchaga yozing — qo&apos;shib beramiz.</p>
        )}
        <ul className="grid gap-2">
          {found.map((b) => (
            <li key={b.id}>
              <form action={addPromoterRecommendation} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                <input type="hidden" name="bookId" value={b.id} />
                <input type="hidden" name="q" value={q} />
                <span className="min-w-0 flex-1 basis-48 text-sm">
                  <b>{b.title}</b> <span className="text-muted">· {b.author.name}</span>
                </span>
                <input name="note" maxLength={200} placeholder="Izoh: nega o'qish kerak (ixtiyoriy)" aria-label="Izoh" className="h-9 min-w-0 flex-1 basis-48 rounded-full border border-border bg-bg px-3 text-xs" />
                <Button className="h-9 text-xs">+ Tavsiya qilish</Button>
              </form>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Tavsiyalarim (${recs.length})`} id="tavsiyalar">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {recs.map((r) => (
            <li key={r.bookId} className="grid gap-2 px-3 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/kitob/${r.book.slug}`} target="_blank" className="min-w-0 hover:underline">
                  <b>{r.book.title}</b> <span className="text-muted">· {r.book.author.name}</span>
                </Link>
                <form action={removePromoterRecommendation}>
                  <input type="hidden" name="bookId" value={r.bookId} />
                  <button className="shrink-0 text-xs text-muted underline">Olib tashlash</button>
                </form>
              </div>
              <form action={updatePromoterNote} className="flex gap-2">
                <input type="hidden" name="bookId" value={r.bookId} />
                <input name="note" defaultValue={r.note ?? ""} maxLength={200} placeholder="Izoh (ixtiyoriy)" aria-label="Izoh" className="h-9 min-w-0 flex-1 rounded-full border border-border bg-bg px-3 text-xs" />
                <button className="h-9 shrink-0 rounded-full border border-border px-3 text-xs font-semibold">Saqlash</button>
              </form>
            </li>
          ))}
          {!recs.length && <li className="px-3 py-4 text-center text-sm text-muted">Hali tavsiya yo&apos;q — yuqoridan kitob qidirib qo&apos;shing.</li>}
        </ul>
      </Section>

      <Section title="Sahifamdagi ma'lumot" id="malumot">
        <form action={savePromoterProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Ism (sahifada ko'rinadi)" name="name" defaultValue={me.name} required maxLength={60} />
          <Field label="Obunachilar" name="followers" defaultValue={me.followers ?? ""} placeholder="25 ming" maxLength={30} />
          <Field label="Rasm havolasi (ixtiyoriy)" name="photoUrl" type="url" defaultValue={me.photoUrl ?? ""} className="sm:col-span-2" hint="https:// bilan boshlanadigan rasm manzili. Bo'lmasa ism bosh harflari ko'rsatiladi" />
          <Area label="O'zim haqimda (600 belgigacha)" name="about" defaultValue={me.about ?? ""} maxLength={600} className="sm:col-span-2" placeholder="Qanday kitoblar haqida yozasiz" />
          <Button className="w-fit">Saqlash</Button>
        </form>
        <p className="mt-3 text-xs text-muted">Instagram manzili va sahifaning saytda ko&apos;rinishi Buqanchada boshqariladi.</p>
      </Section>
    </div>
  );
}
