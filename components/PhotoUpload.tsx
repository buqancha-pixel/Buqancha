"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Profil rasmini tanlash: telefon rasmi brauzerning o'zida 1200 px gacha kichraytiriladi (yuklash tez, 4 MB
 * chegarasidan oshmaydi), keyin forma o'zi yuboriladi. Server rasmni 400×400 qilib saqlaydi.
 */
export function PhotoUpload({ label = "Rasm yuklash" }: { label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async () => {
    const el = input.current;
    const file = el?.files?.[0];
    if (!el || !file) return;
    setBusy(true);
    try {
      const small = await downscale(file, 1200);
      if (small) {
        const dt = new DataTransfer();
        dt.items.add(small);
        el.files = dt.files;
      }
    } catch {
      // kichraytirib bo'lmasa — asl fayl yuboriladi (server 8 MB gacha qabul qiladi)
    }
    el.form?.requestSubmit();
  };

  return (
    <>
      <input ref={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/*" className="sr-only" onChange={onChange} tabIndex={-1} />
      <Trigger busy={busy} label={label} onClick={() => input.current?.click()} />
    </>
  );
}

function Trigger({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  const { pending } = useFormStatus();
  const loading = busy || pending;
  return (
    <button type="button" onClick={onClick} disabled={loading} className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-accent-contrast disabled:opacity-60">
      {loading ? "Yuklanmoqda…" : label}
    </button>
  );
}

async function downscale(file: File, max: number): Promise<File | null> {
  if (!file.type.startsWith("image/") || file.size < 600_000) return null;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob ? new File([blob], "rasm.jpg", { type: "image/jpeg" }) : null;
}
