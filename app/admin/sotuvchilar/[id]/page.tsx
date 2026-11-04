import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { partnerLinkAction, partnerTermAction, saveSellerAction } from "../../actions";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { Area, Button, Check, Field, Flash, PageTitle, Section, Select, type SP } from "../../ui";

export default async function EditSeller({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "yangi";
  const seller = isNew ? null : await prisma.seller.findUnique({ where: { id }, include: { _count: { select: { offers: true } } } });
  if (!isNew && !seller) notFound();
  return (
    <div>
      <PageTitle back={{ href: "/admin/sotuvchilar", label: "Sotuvchilar" }}>{seller?.name ?? "Yangi sotuvchi"}</PageTitle>
      <Flash sp={sp} />
      <form action={saveSellerAction}>
        {seller && <input type="hidden" name="id" value={seller.id} />}
        <Section title="Ma'lumotlar">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomi" name="name" defaultValue={seller?.name ?? ""} required className="sm:col-span-2" />
            <Select label="Turi" name="type" defaultValue={seller?.type ?? "STORE"} required>
              <option value="STORE">Kitob do&apos;koni</option>
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
            <Field label="Ijtimoiy tarmoq" name="social" defaultValue={seller?.social ?? ""} placeholder="Telegram: @…" className="sm:col-span-2" />
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
          {sp.havola && (
            <div className="mb-4 rounded-xl border border-accent bg-accent-soft p-3 text-sm">
              <p className="font-semibold">Kirish havolasi (faqat hozir ko&apos;rinadi — nusxalab, hamkorga Telegram orqali yuboring):</p>
              <input readOnly value={`${SITE_URL}/hamkor/kirish?k=${sp.havola}`} className="mt-2 h-10 w-full rounded-lg border border-border bg-bg px-2 font-mono text-xs" />
            </div>
          )}
          <p className="mb-3 text-sm">
            {seller.partnerTokenHash ? (
              seller.partnerUntil && seller.partnerUntil > new Date() ? (
                <span className="font-semibold text-accent">Faol — {formatDate(seller.partnerUntil)} gacha</span>
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
              ([["30", "+30 kun"], ["365", "+1 yil"], ["0", "Bekor qilish"]] as const).map(([d, label]) => (
                <form key={d} action={partnerTermAction}>
                  <input type="hidden" name="id" value={seller.id} />
                  <input type="hidden" name="days" value={d} />
                  <Button variant={d === "0" ? "danger" : "ghost"} className="h-10">{label}</Button>
                </form>
              ))}
          </div>
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
    </div>
  );
}
