/**
 * Ko'rib chiqish navbati: moslanmagan mahsulotlar va shubhali narxlar.
 *   npm run review
 *   npm run review -- link <unmatchedId> <kitob-slug> [nashriyot]   — mahsulotni kitobga bog'lash
 *   npm run review -- ignore <unmatchedId>
 *   npm run review -- accept <offerId>   — shubhali narxni qabul qilish
 *   npm run review -- reject <offerId>   — shubhali narxni rad etish
 */
import { prisma } from "../lib/db";
import { formatPrice } from "../lib/format";

async function main() {
  const [cmd, id, arg, ...rest] = process.argv.slice(2);

  if (cmd === "link") {
    const item = await prisma.unmatchedItem.findUniqueOrThrow({ where: { id } });
    const book = await prisma.book.findUniqueOrThrow({ where: { slug: arg }, include: { editions: true } });
    const pub = rest.join(" ").toLowerCase();
    const editions = pub ? book.editions.filter((e) => e.publisher.toLowerCase().includes(pub)) : book.editions;
    if (editions.length !== 1) {
      console.error(`Nashrni aniqlab bo'lmadi (${editions.length} ta). Nashriyotni ko'rsating: ${book.editions.map((e) => e.publisher).join(" | ")}`);
      process.exit(1);
    }
    const now = new Date();
    const offer = await prisma.offer.upsert({
      where: { editionId_sellerId: { editionId: editions[0].id, sellerId: item.sellerId } },
      create: { editionId: editions[0].id, sellerId: item.sellerId, price: item.price, inStock: item.inStock, url: item.url, source: "AUTO", lastSeenAt: now, checkedAt: now },
      update: { price: item.price, inStock: item.inStock, url: item.url, source: "AUTO", isSample: false, pendingPrice: null, lastSeenAt: now, checkedAt: now },
    });
    await prisma.priceSnapshot.create({ data: { offerId: offer.id, price: item.price, inStock: item.inStock } });
    await prisma.unmatchedItem.update({ where: { id }, data: { status: "MATCHED" } });
    console.log(`Bog'landi: ${item.title} → ${book.title} (${editions[0].publisher})`);
    return;
  }
  if (cmd === "ignore") {
    await prisma.unmatchedItem.update({ where: { id }, data: { status: "IGNORED" } });
    console.log("E'tiborsiz qoldirildi.");
    return;
  }
  if (cmd === "accept" || cmd === "reject") {
    const offer = await prisma.offer.findUniqueOrThrow({ where: { id } });
    if (offer.pendingPrice == null) {
      console.error("Bu taklifda kutilayotgan narx yo'q.");
      process.exit(1);
    }
    if (cmd === "accept") {
      await prisma.offer.update({ where: { id }, data: { price: offer.pendingPrice, pendingPrice: null } });
      await prisma.priceSnapshot.create({ data: { offerId: id, price: offer.pendingPrice, inStock: offer.inStock } });
      console.log(`Qabul qilindi: ${formatPrice(offer.price)} → ${formatPrice(offer.pendingPrice)}`);
    } else {
      await prisma.offer.update({ where: { id }, data: { pendingPrice: null } });
      console.log("Rad etildi.");
    }
    return;
  }

  const [unmatched, flagged] = await Promise.all([
    prisma.unmatchedItem.findMany({ where: { status: "PENDING" }, include: { seller: true }, orderBy: { lastSeen: "desc" }, take: 50 }),
    prisma.offer.findMany({ where: { pendingPrice: { not: null } }, include: { seller: true, edition: { include: { book: true } } } }),
  ]);
  console.log(`\nShubhali narxlar (${flagged.length}):`);
  for (const o of flagged) {
    console.log(`  ${o.id}  ${o.seller.name} · ${o.edition.book.title}: ${formatPrice(o.price)} → ${formatPrice(o.pendingPrice!)}`);
  }
  console.log(`\nMoslanmagan mahsulotlar (${unmatched.length}):`);
  for (const u of unmatched) {
    console.log(`  ${u.id}  ${u.seller.name} · ${u.title}${u.author ? ` — ${u.author}` : ""} · ${formatPrice(u.price)}${u.isbn ? ` · ISBN ${u.isbn}` : ""}`);
  }
  console.log("");
}

main().finally(() => prisma.$disconnect());
