/**
 * Baza holati: kitoblar, narxlar, sotuvchilar, navbatlar, oxirgi yig'ishlar.
 *   npm run stats
 */
import { prisma } from "../lib/db";

async function main() {
  const [books, manual, editions, withImage, offers, inStock, pending, sample] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { origin: "manual" } }),
    prisma.edition.count(),
    prisma.edition.count({ where: { imageUrl: { not: null } } }),
    prisma.offer.count({ where: { isSample: false } }),
    prisma.offer.count({ where: { isSample: false, inStock: true } }),
    prisma.offer.count({ where: { pendingPrice: { not: null } } }),
    prisma.offer.count({ where: { isSample: true } }),
  ]);
  const noOffers = await prisma.book.count({ where: { editions: { every: { offers: { none: {} } } } } });
  const compared = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*) AS n FROM (
      SELECT e."bookId" FROM "Offer" o JOIN "Edition" e ON e.id = o."editionId"
      WHERE o."isSample" = false AND o."inStock" = true
      GROUP BY e."bookId" HAVING COUNT(DISTINCT o."sellerId") >= 2) x`;
  console.log(`Kitoblar: ${books} (qo'lda ${manual}, narxsiz ${noOffers}, 2+ sotuvchida ${compared[0].n})`);
  console.log(`Nashrlar: ${editions} (rasmli ${withImage})`);
  console.log(`Narxlar: ${offers} (mavjud ${inStock}, ko'rib chiqish kerak ${pending}, namunaviy ${sample})`);

  const unmatched = await prisma.unmatchedItem.groupBy({ by: ["status"], _count: true });
  console.log(`Moslanmagan: ${unmatched.map((u) => `${u.status} ${u._count}`).join(", ") || "yo'q"}`);

  const sellers = await prisma.seller.findMany({
    where: { OR: [{ collector: { not: "NONE" } }, { offers: { some: {} } }] },
    include: {
      _count: { select: { offers: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  console.log("\nSotuvchilar:");
  for (const s of sellers) {
    const r = s.runs[0];
    const run = r ? `${r.startedAt.toISOString().slice(0, 16).replace("T", " ")} ${r.status}` : "yig'ilmagan";
    console.log(`  ${s.slug.padEnd(22)} ${String(s._count.offers).padStart(5)} narx · oxirgi yig'ish: ${run}`);
  }
}

main().finally(() => prisma.$disconnect());
