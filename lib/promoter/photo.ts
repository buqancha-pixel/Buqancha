import sharp from "sharp";
import { prisma } from "../db";
import { AdminError } from "../admin/books";

const MAX_INPUT = 8_000_000; // brauzer kichraytira olmasa ham — 8 MB gacha
const SIZE = 400;

/** Yuklangan rasmni 400×400 WebP qilib saqlaydi (EXIF aylanishi to'g'rilanadi, metama'lumot olib tashlanadi). */
export async function savePromoterPhoto(promoterId: string, file: unknown): Promise<void> {
  if (!(file instanceof File) || file.size === 0) throw new AdminError("Rasm faylini tanlang.");
  if (file.size > MAX_INPUT) throw new AdminError("Rasm juda katta (8 MB gacha).");
  let data: Uint8Array<ArrayBuffer>;
  try {
    const out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    data = new Uint8Array(out);
  } catch {
    throw new AdminError("Rasmni o'qib bo'lmadi. JPG, PNG yoki WebP rasm yuklang.");
  }
  await prisma.$transaction([
    prisma.promoterPhoto.upsert({ where: { promoterId }, create: { promoterId, data }, update: { data } }),
    prisma.promoter.update({ where: { id: promoterId }, data: { photoAt: new Date() } }),
  ]);
}

export async function deletePromoterPhoto(promoterId: string): Promise<void> {
  await prisma.$transaction([
    prisma.promoterPhoto.deleteMany({ where: { promoterId } }),
    prisma.promoter.update({ where: { id: promoterId }, data: { photoAt: null } }),
  ]);
}
