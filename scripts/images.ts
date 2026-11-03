/**
 * Muqova rasmlarini boshqarish.
 *   npm run images -- own <papka>        — o'z suratlaringiz: fayl nomi = ISBN (masalan 9789910922725.jpg)
 *                                          public/covers/ ga ko'chiriladi va nashrga biriktiriladi
 *   npm run images -- block <sotuvchi>   — sotuvchi rasmlarini o'chirish (so'rov bo'lsa) va boshqa saqlamaslik
 *   npm run images -- unblock <sotuvchi> — qayta ruxsat berish (rasmlar keyingi yig'ishda to'ladi)
 *   npm run images -- stats              — nechta nashrda rasm bor
 */
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { prisma } from "../lib/db";
import { normalizeIsbn } from "../lib/collector/isbn";

async function main() {
  const [cmd, arg] = process.argv.slice(2);

  if (cmd === "own") {
    if (!arg) throw new Error("papka ko'rsating");
    mkdirSync("public/covers", { recursive: true });
    let ok = 0;
    const missing: string[] = [];
    for (const f of readdirSync(arg)) {
      const ext = extname(f).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;
      const isbn = normalizeIsbn(f.slice(0, -ext.length));
      if (!isbn) {
        missing.push(`${f} (nomi ISBN emas)`);
        continue;
      }
      const ed = await prisma.edition.findUnique({ where: { isbn } });
      if (!ed) {
        missing.push(`${f} (bazada bu ISBN yo'q)`);
        continue;
      }
      copyFileSync(join(arg, f), `public/covers/${isbn}${ext}`);
      await prisma.edition.update({ where: { id: ed.id }, data: { imageUrl: `/covers/${isbn}${ext}`, imageSource: "own" } });
      ok++;
    }
    console.log(`Biriktirildi: ${ok} ta surat.`);
    for (const m of missing) console.log(`  o'tkazib yuborildi: ${m}`);
    return;
  }

  if (cmd === "block" || cmd === "unblock") {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { slug: arg } });
    await prisma.seller.update({ where: { id: seller.id }, data: { allowImages: cmd === "unblock" } });
    if (cmd === "block") {
      const r = await prisma.edition.updateMany({ where: { imageSource: seller.slug }, data: { imageUrl: null, imageSource: null } });
      console.log(`${seller.name}: ${r.count} ta rasm o'chirildi, endi saqlanmaydi.`);
    } else console.log(`${seller.name}: rasmlarga ruxsat berildi.`);
    return;
  }

  const [total, withImg, own] = await Promise.all([
    prisma.edition.count(),
    prisma.edition.count({ where: { imageUrl: { not: null } } }),
    prisma.edition.count({ where: { imageSource: "own" } }),
  ]);
  console.log(`Nashrlar: ${total}, rasmi bor: ${withImg} (o'z suratlari: ${own}).`);
}

main().finally(() => prisma.$disconnect());
