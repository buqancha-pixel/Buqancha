import { prisma } from "../db";
import { toWebp } from "../photo";

/** Bloger profil rasmi: kvadratga kesiladi. */
export async function savePromoterPhoto(promoterId: string, file: unknown): Promise<void> {
  const data = await toWebp(file, "cover");
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

/** Sahifa banneri: 1500×500 ga kesiladi. */
export async function savePromoterBanner(promoterId: string, file: unknown): Promise<void> {
  const data = await toWebp(file, "cover", 1500, 500);
  await prisma.$transaction([
    prisma.promoterBanner.upsert({ where: { promoterId }, create: { promoterId, data }, update: { data } }),
    prisma.promoter.update({ where: { id: promoterId }, data: { bannerAt: new Date() } }),
  ]);
}

export async function deletePromoterBanner(promoterId: string): Promise<void> {
  await prisma.$transaction([
    prisma.promoterBanner.deleteMany({ where: { promoterId } }),
    prisma.promoter.update({ where: { id: promoterId }, data: { bannerAt: null } }),
  ]);
}
