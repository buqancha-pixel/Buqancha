import type { Edition, Seller } from "@prisma/client";
import { Field, Select } from "../ui";

/** Nashr maydonlari (yangi kitob, yangi nashr va nashrni tahrirlash formalari uchun). */
export function EditionFields({ e, sellers, prefix = "" }: { e?: Partial<Edition>; sellers: Pick<Seller, "slug" | "name">[]; prefix?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nashriyot" name="publisher" defaultValue={e?.publisher ?? ""} required id={`${prefix}publisher`} />
      <Field label="ISBN" name="isbn" defaultValue={e?.isbn ?? ""} inputMode="numeric" hint="Bo'lsa, albatta kiriting — narxlar ISBN bo'yicha avtomatik topiladi" id={`${prefix}isbn`} />
      <Field label="Yili" name="year" defaultValue={e?.year ?? ""} inputMode="numeric" id={`${prefix}year`} />
      <Field label="Betlar soni" name="pages" defaultValue={e?.pages ?? ""} inputMode="numeric" id={`${prefix}pages`} />
      <Select label="Muqova" name="cover" defaultValue={e?.cover ?? ""} id={`${prefix}cover`}>
        <option value="">Ko&apos;rsatilmagan</option>
        <option value="qattiq">Qattiq</option>
        <option value="yumshoq">Yumshoq</option>
      </Select>
      <div />
      <Field label="Muqova rasmi havolasi" name="imageUrl" defaultValue={e?.imageUrl ?? ""} type="url" placeholder="https://…" className="sm:col-span-2" id={`${prefix}imageUrl`}
        hint="Sotuvchi saytidagi rasm havolasi yoki o'zingizniki" />
      <Select label="Rasm manbasi (saytda ko'rsatiladi)" name="imageSource" defaultValue={e?.imageSource ?? "own"} className="sm:col-span-2" id={`${prefix}imageSource`}>
        <option value="own">O&apos;zim (Buqancha)</option>
        {sellers.map((s) => (
          <option key={s.slug} value={s.slug}>{s.name}</option>
        ))}
      </Select>
    </div>
  );
}
