import Link from "next/link";
import { prisma } from "@/lib/db";
import { searchBooks } from "@/lib/books";
import { requirePromoter } from "@/lib/promoter/auth";
import { avatarColor, promoterBannerSrc, promoterPhotoSrc } from "@/lib/promoters";
import { formatNumber } from "@/lib/format";
import { PhotoUpload } from "@/components/PhotoUpload";
import { NoteField } from "@/components/NoteField";
import { SocialLinks } from "@/components/SocialLinks";
import { PromoterAvatar } from "@/components/PromoterAvatar";
import { PromoterBanner } from "@/components/PromoterBanner";
import { SITE_URL } from "@/lib/site";
import {
  addPromoterRecommendation, createPromoterList, deletePromoterList, promoterLogout, removePromoterBanner, removePromoterPhoto,
  removePromoterRecommendation, savePromoterProfile, setReadingBook, updatePromoterList, updatePromoterNote, uploadPromoterBanner,
  uploadPromoterPhoto,
} from "./actions";
import { Area, Button, Field, Flash, Section, inputCls } from "../admin/ui";

type SP = Promise<{ q?: string; ok?: string; xato?: string }>;

const RATINGS = [
  ["", "Baho yo'q"],
  ["5", "★★★★★ 5"],
  ["4", "★★★★ 4"],
  ["3", "★★★ 3"],
  ["2", "★★ 2"],
  ["1", "★ 1"],
] as const;

function RatingSelect({ value }: { value?: number | null }) {
  return (
    <select name="rating" defaultValue={value ? String(value) : ""} aria-label="Baho" className="h-9 rounded-full border border-border bg-bg px-3 text-xs">
      {RATINGS.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export default async function PromoterCabinet({ searchParams }: { searchParams: SP }) {
  const me = await requirePromoter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const since = new Date(Date.now() - 29 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const [recs, lists, days, totals] = await Promise.all([
    prisma.promoterBook.findMany({
      where: { promoterId: me.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { book: { select: { id: true, slug: true, title: true, author: { select: { name: true } }, editions: { select: { imageUrl: true, imageSource: true } } } } },
    }),
    prisma.promoterList.findMany({ where: { promoterId: me.id }, orderBy: { createdAt: "desc" }, include: { books: { orderBy: { position: "asc" }, select: { bookId: true } } } }),
    prisma.promoterStat.findMany({ where: { promoterId: me.id, day: { gte: since } }, orderBy: { day: "asc" } }),
    prisma.promoterStat.aggregate({ where: { promoterId: me.id }, _sum: { views: true, clicks: true } }),
  ]);
  const have = new Set(recs.map((r) => r.bookId));
  const found = q ? (await searchBooks(q, 15)).filter((b) => !have.has(b.id)) : [];
  const visible = me.consent && me.active;
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const color = avatarColor(me.name);
  const covers = recs.map((r) => r.book.editions.find((e) => e.imageUrl)?.imageUrl).filter((u): u is string => !!u);

  // oxirgi 30 kun (bo'sh kunlar 0)
  const byDay = new Map(days.map((d) => [d.day.toISOString().slice(0, 10), d]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10);
    return { d, views: byDay.get(d)?.views ?? 0, clicks: byDay.get(d)?.clicks ?? 0 };
  });
  const month = series.reduce((a, x) => ({ views: a.views + x.views, clicks: a.clicks + x.clicks }), { views: 0, clicks: 0 });
  const peak = Math.max(1, ...series.map((x) => x.views));

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <PromoterAvatar name={me.name} photoUrl={promoterPhotoSrc(me)} color={color} size={56} />
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
          <li><b className="text-text">Kitob qidiring</b> — &quot;Kitob tavsiya qilish&quot; qatoriga nomi yoki muallifini yozib, &quot;Qidirish&quot;ni bosing.</li>
          <li><b className="text-text">Tavsiya va baho</b> — kitob ostidagi maydonga 500 so&apos;zgacha fikringizni yozing, 1–5 yulduz baho qo&apos;ying va &quot;+ Tavsiya qilish&quot;ni bosing.</li>
          <li><b className="text-text">Eng sevimli</b> — &quot;Tavsiyalarim&quot;da 3 tagacha kitobni &quot;📌 Eng sevimli&quot; qiling: ular sahifangiz boshida turadi.</li>
          <li><b className="text-text">Hozir o&apos;qiyapman</b> — o&apos;qiyotgan kitobingiz yonidagi tugmani bosing, sahifangiz tepasida chiqadi.</li>
          <li><b className="text-text">📲 Story rasmi</b> — har bir tavsiya yonidagi tugma Instagram story uchun tayyor rasm beradi: muqova, narx, fikringiz va sahifangiz manzili. Yuklab oling va story&apos;ga qo&apos;ying.</li>
          <li><b className="text-text">To&apos;plamlar</b> — &quot;Yozda o&apos;qish uchun 10 kitob&quot; kabi ro&apos;yxat tuzing; har birining alohida havolasi bo&apos;ladi.</li>
          <li><b className="text-text">Rasm, banner va ma&apos;lumot</b> — profil rasmi, sahifa banneri, o&apos;zingiz haqingizda, Telegram va YouTube.</li>
        </ol>
        <p className="mt-3 text-muted">
          Kitob saytda topilmasa, nomini Buqanchaga yozing — qo&apos;shib beramiz. Bu havola parol o&apos;rnida: uni hech kimga bermang.
          {visible ? <> Sahifangiz manzili: <Link href={`/targibotchilar/${me.slug}`} className="text-accent underline">{host}/targibotchilar/{me.slug}</Link></> : null}
        </p>
      </details>

      <Section title="Statistika" id="statistika">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted">Sahifangizni ko&apos;rdi (30 kun)</p><p className="text-2xl font-semibold tabular">{formatNumber(month.views)}</p></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted">Tavsiyangizdan kitobga o&apos;tdi (30 kun)</p><p className="text-2xl font-semibold tabular">{formatNumber(month.clicks)}</p></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted">Jami ko&apos;rishlar</p><p className="text-2xl font-semibold tabular">{formatNumber(totals._sum.views ?? 0)}</p></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted">Jami o&apos;tishlar</p><p className="text-2xl font-semibold tabular">{formatNumber(totals._sum.clicks ?? 0)}</p></div>
        </div>
        <div className="mt-4 flex h-24 items-end gap-[3px]" aria-label="Oxirgi 30 kundagi ko'rishlar">
          {series.map((x) => (
            <div key={x.d} title={`${x.d}: ${x.views} ko'rish, ${x.clicks} o'tish`} className="flex-1 rounded-t bg-accent/70" style={{ height: `${Math.max(3, (x.views / peak) * 100)}%`, opacity: x.views ? 1 : 0.25 }} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Faqat umumiy sonlar: kim ko&apos;rgani saqlanmaydi. Bir kishi kuniga bir marta sanaladi.</p>
      </Section>

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
                <NoteField />
                <RatingSelect />
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
                  {r.pinned && <span className="mr-1">📌</span>}
                  <b>{r.book.title}</b> <span className="text-muted">· {r.book.author.name}</span>
                  {me.readingBookId === r.bookId && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">📖 hozir o&apos;qiyapman</span>}
                </Link>
                <form action={removePromoterRecommendation}>
                  <input type="hidden" name="bookId" value={r.bookId} />
                  <button className="shrink-0 text-xs text-muted underline">Olib tashlash</button>
                </form>
              </div>
              <form action={updatePromoterNote} className="grid gap-2">
                <input type="hidden" name="bookId" value={r.bookId} />
                <NoteField defaultValue={r.note ?? ""} rows={r.note && r.note.length > 200 ? 6 : 3} />
                <div className="flex flex-wrap items-center gap-3">
                  <RatingSelect value={r.rating} />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="pinned" defaultChecked={r.pinned} className="h-4 w-4" /> 📌 Eng sevimli
                  </label>
                  <button className="h-9 rounded-full border border-border px-4 text-xs font-semibold">Saqlash</button>
                </div>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/rasm/story/${me.id}/${r.bookId}?yuklab=1`}
                  className="inline-flex h-9 items-center rounded-full bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)] px-4 text-xs font-semibold text-white"
                >
                  📲 Story rasmi
                </a>
                <a href={`/rasm/story/${me.id}/${r.bookId}`} target="_blank" className="text-xs text-muted underline">ko&apos;rish</a>
                <form action={setReadingBook}>
                  <input type="hidden" name="bookId" value={me.readingBookId === r.bookId ? "" : r.bookId} />
                  <button className="h-9 rounded-full border border-border px-3 text-xs">
                    {me.readingBookId === r.bookId ? "O'qib bo'ldim" : "📖 Hozir o'qiyapman"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {!recs.length && <li className="px-3 py-4 text-center text-sm text-muted">Hali tavsiya yo&apos;q — yuqoridan kitob qidirib qo&apos;shing.</li>}
        </ul>
      </Section>

      <Section title={`To'plamlarim (${lists.length})`} id="toplamlar">
        {recs.length === 0 ? (
          <p className="text-sm text-muted">Avval kitob tavsiya qiling — to&apos;plamga o&apos;z tavsiyalaringizdan kitob tanlanadi.</p>
        ) : (
          <>
            <details className="mb-4 rounded-xl border border-border p-3 [&_summary::-webkit-details-marker]:hidden" open={lists.length === 0}>
              <summary className="cursor-pointer list-none text-sm font-semibold">+ Yangi to&apos;plam</summary>
              <form action={createPromoterList} className="mt-3 grid gap-3">
                <Field label="Nomi" name="title" required maxLength={80} placeholder="Yozda o'qish uchun 10 kitob" />
                <Area label="Qisqacha (ixtiyoriy)" name="about" maxLength={600} placeholder="Kimlar uchun, nega aynan shu kitoblar" />
                <BookPicker recs={recs} selected={[]} />
                <Button className="w-fit">Yaratish</Button>
              </form>
            </details>
            <ul className="grid gap-3">
              {lists.map((l) => (
                <li key={l.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{l.title} <span className="text-sm font-normal text-muted">· {l.books.length} ta kitob</span></p>
                    {visible && (
                      <Link href={`/targibotchilar/${me.slug}/${l.slug}`} target="_blank" className="text-xs text-accent underline">
                        {host}/targibotchilar/{me.slug}/{l.slug} ↗
                      </Link>
                    )}
                  </div>
                  <details className="mt-2 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer list-none text-xs text-muted underline">Tahrirlash</summary>
                    <form action={updatePromoterList} className="mt-3 grid gap-3">
                      <input type="hidden" name="listId" value={l.id} />
                      <Field label="Nomi" name="title" required maxLength={80} defaultValue={l.title} />
                      <Area label="Qisqacha" name="about" maxLength={600} defaultValue={l.about ?? ""} />
                      <BookPicker recs={recs} selected={l.books.map((b) => b.bookId)} />
                      <Button className="w-fit">Saqlash</Button>
                    </form>
                    <form action={deletePromoterList} className="mt-3">
                      <input type="hidden" name="listId" value={l.id} />
                      <button className="text-xs text-red-500 underline">To&apos;plamni o&apos;chirish</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Profil rasmi" id="rasm">
        <div className="flex flex-wrap items-center gap-4">
          <PromoterAvatar name={me.name} photoUrl={promoterPhotoSrc(me)} color={color} size={96} />
          <div className="grid gap-2">
            <form action={uploadPromoterPhoto}>
              <PhotoUpload label={me.photoAt ? "Boshqa rasm yuklash" : "Rasm yuklash"} />
            </form>
            {me.photoAt && (
              <form action={removePromoterPhoto}>
                <button className="text-xs text-muted underline">Rasmni olib tashlash</button>
              </form>
            )}
            <p className="max-w-xs text-xs text-muted">Telefon yoki kompyuterdan JPG/PNG rasm. Kvadrat qilib kesiladi — yuzingiz o&apos;rtada bo&apos;lsin.</p>
          </div>
        </div>
      </Section>

      <Section title="Sahifa banneri" id="banner">
        <PromoterBanner src={promoterBannerSrc(me)} covers={covers} color={color} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form action={uploadPromoterBanner}>
            <PhotoUpload label={me.bannerAt ? "Boshqa banner yuklash" : "Banner yuklash"} />
          </form>
          {me.bannerAt && (
            <form action={removePromoterBanner}>
              <button className="text-xs text-muted underline">Bannerni olib tashlash</button>
            </form>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Keng rasm (masalan 1500×500) — 3:1 nisbatda kesiladi. Yuklamasangiz, tavsiya qilgan kitoblaringiz muqovalaridan kollaj chiqadi (yuqoridagidek).
        </p>
      </Section>

      <Section title="Sahifamdagi ma'lumot" id="malumot">
        <form action={savePromoterProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="Ism (sahifada ko'rinadi)" name="name" defaultValue={me.name} required maxLength={60} />
          <Field label="Obunachilar" name="followers" defaultValue={me.followers ?? ""} placeholder="25 ming" maxLength={30} />
          <div className="grid gap-2 sm:col-span-2">
            <p className="text-sm font-medium">Tarmoqlarim — sahifangizda logolar bilan chiqadi</p>
            <SocialLinks instagram={me.instagram} telegram={me.telegram} youtube={me.youtube} size="sm" />
          </div>
          <Field label="Telegram kanal yoki username" name="telegram" defaultValue={me.telegram ? `@${me.telegram}` : ""} placeholder="@kanalim yoki t.me/kanalim" />
          <Field label="YouTube kanal havolasi" name="youtube" defaultValue={me.youtube ?? ""} placeholder="https://www.youtube.com/@kanalim" />
          <Area label="O'zim haqimda (600 belgigacha)" name="about" defaultValue={me.about ?? ""} maxLength={600} className="sm:col-span-2" placeholder="Qanday kitoblar haqida yozasiz" />
          <Button className="w-fit">Saqlash</Button>
        </form>
        <p className="mt-3 text-xs text-muted">Instagram (@{me.instagram}) va sahifaning saytda ko&apos;rinishi Buqanchada boshqariladi. Bo&apos;sh qoldirilgan tarmoq sahifada chiqmaydi.</p>
      </Section>
    </div>
  );
}

/** To'plamga o'z tavsiyalaridan kitob tanlash (belgilangan tartibda saqlanadi). */
function BookPicker({ recs, selected }: { recs: Array<{ bookId: string; book: { title: string; author: { name: string } } }>; selected: string[] }) {
  const sel = new Set(selected);
  // tanlanganlar avval (saqlangan tartibda), keyin qolganlari
  const ordered = [...selected.map((id) => recs.find((r) => r.bookId === id)).filter((r): r is (typeof recs)[number] => !!r), ...recs.filter((r) => !sel.has(r.bookId))];
  return (
    <fieldset className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border border-border p-2">
      <legend className="px-1 text-sm font-medium">Kitoblar (tavsiyalaringizdan, 50 tagacha)</legend>
      {ordered.map((r) => (
        <label key={r.bookId} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
          <input type="checkbox" name="books" value={r.bookId} defaultChecked={sel.has(r.bookId)} className="h-4 w-4" />
          <span className="truncate">{r.book.title} <span className="text-muted">· {r.book.author.name}</span></span>
        </label>
      ))}
    </fieldset>
  );
}
