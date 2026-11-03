import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSellerAction } from "../../actions";
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
        <p className="text-sm text-muted">
          {seller._count.offers} ta narx.{" "}
          {seller.collector !== "NONE" ? "Narxlar har kecha avtomatik yangilanadi." : "Narxlar qo'lda kiritiladi (kitob sahifasidan)."}
        </p>
      )}
    </div>
  );
}
