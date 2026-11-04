import sharp from "sharp";
import { AdminError } from "./admin/books";

const MAX_INPUT = 8_000_000; // brauzer kichraytira olmasa ham — 8 MB gacha

/**
 * Yuklangan rasm → 400×400 WebP (EXIF aylanishi to'g'rilanadi, metama'lumot olib tashlanadi).
 * "cover" — kvadratga kesiladi (profil rasmi); "contain" — butun sig'diriladi, shaffof fon (logotip).
 */
export async function toWebp(file: unknown, fit: "cover" | "contain" = "cover"): Promise<Uint8Array<ArrayBuffer>> {
  if (!(file instanceof File) || file.size === 0) throw new AdminError("Rasm faylini tanlang.");
  if (file.size > MAX_INPUT) throw new AdminError("Rasm juda katta (8 MB gacha).");
  try {
    const out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(400, 400, fit === "cover" ? { fit: "cover", position: "attention" } : { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new AdminError("Rasmni o'qib bo'lmadi. JPG, PNG yoki WebP rasm yuklang.");
  }
}
