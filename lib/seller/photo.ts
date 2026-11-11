import { prisma } from "../db";
import { toWebp } from "../photo";

/** Sotuvchi logotipi yoki do'kon rasmi: kesilmaydi, kvadratga sig'diriladi. */
export async function saveSellerPhoto(sellerId: string, file: unknown): Promise<void> {
  const data = await toWebp(file, "contain");
  await prisma.$transaction([
    prisma.sellerPhoto.upsert({ where: { sellerId }, create: { sellerId, data }, update: { data } }),
    prisma.seller.update({ where: { id: sellerId }, data: { photoAt: new Date() } }),
  ]);
}

export async function deleteSellerPhoto(sellerId: string): Promise<void> {
  await prisma.$transaction([
    prisma.sellerPhoto.deleteMany({ where: { sellerId } }),
    prisma.seller.update({ where: { id: sellerId }, data: { photoAt: null } }),
  ]);
}

/** Rasm manzili (yuklanmagan bo'lsa null). */
export function sellerPhotoSrc(s: { id: string; photoAt?: Date | null }): string | null {
  return s.photoAt ? `/rasm/sotuvchi/${s.id}?v=${new Date(s.photoAt).getTime()}` : null;
}
