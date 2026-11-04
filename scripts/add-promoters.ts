/**
 * Targ'ibotchilarni Instagram username'lari bo'yicha qo'shish (mavjudlari o'tkazib yuboriladi).
 *   npm run add-promoters -- janob_kutubxonaci gafurov.0ff +shakhreads
 * "+" bilan boshlangani — rozilik olingan (darhol saytda ko'rinadi); qolganlari rozilik belgisisiz qo'shiladi.
 * Ism sifatida username yoziladi — haqiqiy ism, tavsif va obunachilar admin panelda to'ldiriladi.
 */
import { prisma } from "../lib/db";
import { slugify } from "../lib/normalize";

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!args.length) {
    console.error("Foydalanish: npm run add-promoters -- <username> [+<rozilik-olingan>] ...");
    process.exitCode = 2;
    return;
  }
  const last = await prisma.promoter.aggregate({ _max: { position: true } });
  let pos = (last._max.position ?? 0) + 1;
  for (const raw of args) {
    const consent = raw.startsWith("+");
    const handle = raw.replace(/^\+/, "").replace(/^@/, "").trim();
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
      console.log(`  ✗ ${raw}: username noto'g'ri`);
      continue;
    }
    const exists = await prisma.promoter.findFirst({ where: { instagram: { equals: handle, mode: "insensitive" } } });
    if (exists) {
      console.log(`  = @${handle}: allaqachon bor`);
      continue;
    }
    const base = slugify(handle.replace(/[._]+/g, " ")) || "bloger";
    let slug = base;
    for (let i = 2; await prisma.promoter.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    await prisma.promoter.create({ data: { slug, name: handle, instagram: handle, consent, position: pos++ } });
    console.log(`  + @${handle}${consent ? " (saytda)" : " (rozilik kutilmoqda — saytda ko'rinmaydi)"}`);
  }
}

main().finally(() => prisma.$disconnect());
