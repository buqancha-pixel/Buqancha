import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteSellerAction, partnerLinkAction, partnerTermAction, saveSellerAction } from "../../actions";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { CopyBox } from "@/components/CopyBox";
import { PARTNER_TERMS, isForever } from "@/lib/partner/auth";
import { Area, Button, Check, Field, Flash, PageTitle, Section, Select, type SP } from "../../ui";

export default async function EditSeller({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "yangi";
  const seller = isNew
    ? null
    : await prisma.seller.findUnique({
        where: { id },
        include: { _count: { select: { offers: true } }, runs: { where: { kind: "FEED" }, orderBy: { startedAt: "desc" }, take: 8 } },
      });
  if (!isNew && !seller) notFound();
  return (
    <div>
      <PageTitle back={{ href: "/admin/sotuvchilar", label: "Sotuvchilar" }}>{seller?.name ?? "Yangi sotuvchi"}</PageTitle>
      <Flash sp={sp} />
      {seller && sp.havola && (
        <div className="mb-5 grid gap-3 rounded-xl border border-accent bg-accent-soft p-3 text-sm">
          <p className="font-semibold">1. Kirish havolasi (faqat hozir ko&apos;rinadi — sahifadan chiqsangiz, qayta ko&apos;rsatilmaydi):</p>
          <CopyBox text={`${SITE_URL}/hamkor/kirish?k=${sp.havola}`} label="Havolani nusxalash" />
          <p className="font-semibold">2. Do&apos;konga yuboriladigan tayyor xabar (havola ichida):</p>
          <CopyBox text={storeGuide(seller.name, `${SITE_URL}/hamkor/kirish?k=${sp.havola}`, seller.partnerUntil)} rows={14} label="Xabarni nusxalash" />
        </div>
      )}
      <form action={saveSellerAction}>
        {seller && <input type="hidden" name="id" value={seller.id} />}
        <Section title="Ma'lumotlar">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomi" name="name" defaultValue={seller?.name ?? ""} required className="sm:col-span-2" />
            <Select label="Turi" name="type" defaultValue={seller?.type ?? "STORE"} required>
              <option value="STORE">Kitob do&apos;koni</option>
              <option value="ONLINE">Onlayn do&apos;kon</option>
              <option value="PUBLISHER">Nashriyot</option>
              <option value="MARKETPLACE">Marketpleys</option>
            </Select>
            <Field label="Shahar" name="city" defaultValue={seller?.city ?? "Toshkent"} required />
            <Field label="Sayt" name="website" type="url" defaultValue={seller?.website ?? ""} placeholder="https://" className="sm:col-span-2" />
            <Field label="Manzil" name="address" defaultValue={seller?.address ?? ""} className="sm:col-span-2" />
            <Field
              label="Xaritadagi joylashuv"
              name="location"
              defaultValue={seller?.lat != null && seller?.lng != null ? `${seller.lat}, ${seller.lng}` : ""}
              placeholder="41.311081, 69.240562"
              className="sm:col-span-2"
              hint="Google Maps'da do'kon ustiga barmoqni bosib turing — tepada koordinata chiqadi, nusxalab shu yerga qo'ying. Yoki brauzerdagi to'liq xarita havolasi. Bo'sh qolsa, xaritada nuqta chiqmaydi."
            />
            <Field label="Telefon" name="phone" type="tel" defaultValue={seller?.phone ?? ""} placeholder="+998 90 123 45 67" />
            <Field label="Telegram" name="telegram" defaultValue={seller?.telegram ? `@${seller.telegram}` : ""} placeholder="@dokon" />
            <Field label="Instagram" name="instagram" defaultValue={seller?.instagram ? `@${seller.instagram}` : ""} placeholder="@dokon" />
            <Field label="Boshqa tarmoq (eski maydon)" name="social" defaultValue={seller?.social ?? ""} placeholder="Telegram: @…" />
            <Area label="Tavsif" name="description" defaultValue={seller?.description ?? ""} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <Check label="Muqova rasmlarini shu sotuvchi saytidan ko'rsatish" name="allowImages" defaultChecked={seller?.allowImages ?? true} />
              <p className="mt-1 text-xs text-muted">Sotuvchi e&apos;tiroz bildirsa, belgini olib tashlang — uning rasmlari darhol olib tashlanadi.</p>
            </div>
          </div>
          <Button className="mt-4">Saqlash</Button>
        </Section>
      </form>
      {seller && (
        <Section title="Hamkor kabineti" id="hamkor">
          <p className="mb-3 text-sm">
            {seller.partnerTokenHash ? (
              seller.partnerUntil && seller.partnerUntil > new Date() ? (
                <span className="font-semibold text-accent">{isForever(seller.partnerUntil) ? "Faol — muddatsiz" : `Faol — ${formatDate(seller.partnerUntil)} gacha`}</span>
              ) : (
                <span className="font-semibold text-warn-text">Muddati tugagan{seller.partnerUntil ? ` (${formatDate(seller.partnerUntil)})` : ""}</span>
              )
            ) : (
              <span className="text-muted">Kabinet ochilmagan.</span>
            )}
            {seller.partnerSince && <span className="text-muted"> · hamkor {formatDate(seller.partnerSince)} dan</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={partnerLinkAction}>
              <input type="hidden" name="id" value={seller.id} />
              <Button className="h-10">{seller.partnerTokenHash ? "Yangi havola (eskisi o'chadi)" : "Kabinet ochish (30 kun bepul)"}</Button>
            </form>
            {seller.partnerTokenHash &&
              ([...PARTNER_TERMS.map(([v, l]) => [v, v === "muddatsiz" ? l : `+${l}`] as const), ["0", "Bekor qilish"] as const]).map(([d, label]) => (
                <form key={d} action={partnerTermAction}>
                  <input type="hidden" name="id" value={seller.id} />
                  <input type="hidden" name="days" value={d} />
                  <Button variant={d === "0" ? "danger" : "ghost"} className="h-10">{label}</Button>
                </form>
              ))}
          </div>
          {seller.runs.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-sm font-semibold">Fayl yuklashlari</p>
              <ul className="divide-y divide-border rounded-xl border border-border text-xs">
                {seller.runs.map((r) => {
                  const st = (r.stats ?? {}) as Record<string, number>;
                  return (
                    <li key={r.id} className="px-3 py-2">
                      {formatDate(r.startedAt)} · {r.status} · {st.seen ?? 0} qator: {st.created ?? 0} yangi, {st.updated ?? 0} yangilandi
                      {st.newBooks ? `, ${st.newBooks} yangi kitob` : ""}
                      {st.unmatched ? `, ${st.unmatched} qo'shilmadi` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Hamkor havola orqali kiradi (login va parol yo&apos;q). Muddat tugasa narxlari qoladi, faqat tahrirlash va &quot;Hamkor&quot; belgisi yopiladi.
          </p>
        </Section>
      )}
      {seller && (
        <p className="text-sm text-muted">
          {seller._count.offers} ta narx.{" "}
          {seller.collector !== "NONE" ? "Narxlar har kecha avtomatik yangilanadi." : "Narxlar qo'lda kiritiladi (kitob sahifasidan)."}
        </p>
      )}
      {seller && (
        <Section title="Sotuvchini o'chirish" id="ochirish">
          <form action={deleteSellerAction} className="grid gap-3">
            <input type="hidden" name="id" value={seller.id} />
            <p className="text-sm text-muted">
              Sotuvchi saytdan butunlay o&apos;chadi, uning {seller._count.offers} ta narxi ham. Kitoblar qoladi. Keyin kerak bo&apos;lsa,
              &quot;Yangi sotuvchi&quot; orqali qayta qo&apos;shasiz.
            </p>
            <Check label="Ha, sotuvchi barcha narxlari bilan o'chirilsin" name="confirm" value="ha" />
            <Button variant="danger" className="w-fit">O&apos;chirish</Button>
          </form>
        </Section>
      )}
    </div>
  );
}

/** Do'konga havola bilan yuboriladigan yo'riqnoma. */
function storeGuide(name: string, link: string, until: Date | null) {
  const term = !until ? "" : isForever(until) ? " (muddatsiz)" : ` (${formatDate(until)} gacha)`;
  return [
    `Assalomu alaykum! Buqancha — kitob narxlarini solishtirish saytida «${name}» uchun shaxsiy kabinet ochildi${term}.`,
    "Xaridorlar kitob qidirganda sizning narxlaringizni ko'radi va siz bilan to'g'ridan-to'g'ri bog'lanadi.",
    "",
    "Kabinetga kirish havolasi:",
    link,
    "",
    "Qanday ishlatiladi:",
    "1. Havolani oching va \"Kabinetga kirish\" tugmasini bosing. Login va parol kerak emas — havola parol o'rnida, uni hech kimga bermang.",
    "2. \"Do'kon ma'lumotlari va aloqa\" bo'limida telefon, Telegram yoki Instagram'ingizni yozing — xaridor \"Buyurtma berish\" tugmasini bosganda shular chiqadi.",
    "3. \"Qo'shish\" bo'limida kitob nomi yoki ISBN'ni qidiring, narxingizni yozib \"Qo'shish\"ni bosing.",
    "4. Kitob ko'p bo'lsa — \"Fayl\" bo'limidagi Excel namunani yuklab oling, to'ldirib, bitta fayl bilan yuklang.",
    "5. Saytda yo'q kitobni \"Yangi kitob\" bo'limida ISBN, nom va muallif bilan qo'shasiz.",
    "6. Narx o'zgarsa yoki kitob tugasa — \"Narxlar\" ro'yxatida yangilang.",
    "",
    "Kabinet telefonda ham ishlaydi. Savollar bo'lsa, shu yerga yozing.",
  ].join("\n");
}
