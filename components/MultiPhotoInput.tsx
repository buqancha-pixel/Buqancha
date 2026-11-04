"use client";

import { useRef, useState } from "react";

/**
 * Bir nechta rasm tanlash (6 tagacha): telefon rasmlari brauzerda 1600px gacha kichraytiriladi —
 * yuklash tez, Vercel'ning 4 MB chegarasidan oshmaydi. Tanlanganlar oldindan ko'rinadi.
 */
export function MultiPhotoInput({ max = 6, required = false }: { max?: number; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onChange = async () => {
    const el = ref.current;
    if (!el?.files) return;
    setBusy(true);
    const picked = Array.from(el.files).slice(0, max);
    const out: File[] = [];
    for (const f of picked) out.push((await shrink(f).catch(() => null)) ?? f);
    const dt = new DataTransfer();
    out.forEach((f) => dt.items.add(f));
    el.files = dt.files;
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(out.map((f) => URL.createObjectURL(f)));
    setBusy(false);
  };

  return (
    <div className="grid gap-2">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-semibold">
        🖼 {busy ? "Tayyorlanmoqda…" : `Rasm tanlash (${max} tagacha)`}
        <input ref={ref} type="file" name="images" accept="image/*" multiple required={required} onChange={onChange} className="sr-only" />
      </label>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="size-20 rounded-lg object-cover ring-1 ring-border" />
          ))}
        </div>
      )}
    </div>
  );
}

async function shrink(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/") || file.size < 500_000) return null;
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
}
