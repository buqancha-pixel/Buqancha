/**
 * Barcha "moslanmagan" (PENDING) mahsulotlarni saytga chiqarish.
 *   npm run publish-unmatched              — faqat hisobot: nechtasi ulanadi, yaratiladi, o'tkaziladi (bazaga yozmaydi)
 *   npm run publish-unmatched -- --qollash — bajaradi
 * Diniy adabiyot, kitob emasdek ko'ringan mahsulotlar (pazl, marker, daftar…) va ISBN ham, muallif ham yo'qlari
 * o'tkaziladi — ular "Moslanmagan"da qoladi, admin ularni bittalab chiqaradi.
 */
import { prisma } from "../lib/db";
import { executePlan, planPublish } from "../lib/admin/publish";

async function main() {
  const apply = process.argv.includes("--qollash");
  const items = await prisma.unmatchedItem.findMany({
    where: { status: "PENDING" },
    include: { seller: { select: { name: true, type: true, slug: true } } },
    orderBy: [{ isbn: { sort: "asc", nulls: "last" } }, { firstSeen: "asc" }], // ISBN'lilar avval — keyingilari ularga ulanadi
  });
  const counts = { link: 0, create: 0, religious: 0, nonbook: 0, noinfo: 0, matched: 0, error: 0 };
  const samples: Record<string, string[]> = { create: [], religious: [], nonbook: [], noinfo: [] };
  const createdKeys = new Set<string>();
  for (const item of items) {
    try {
      const plan = await planPublish(item);
      if (plan.action === "skip") {
        counts[plan.reason]++;
        if (samples[plan.reason] && samples[plan.reason].length < 15) samples[plan.reason].push(`${item.seller.slug}: ${item.title}`);
        continue;
      }
      if (!apply) {
        // hisobotda: bir xil nomli ikkinchi mahsulot birinchisi yaratgan kitobga ulanadi
        const k = plan.title.toLowerCase();
        if (plan.action === "create" && createdKeys.has(k)) counts.link++;
        else counts[plan.action]++;
        if (plan.action === "create") {
          createdKeys.add(k);
          if (samples.create.length < 15) samples.create.push(`${item.seller.slug}: ${plan.title}${plan.language ? ` [${plan.language}]` : ""}`);
        }
        continue;
      }
      const r = await executePlan(item, plan);
      counts[r === "linked" ? "link" : "create"]++;
    } catch (e) {
      counts.error++;
      if (counts.error <= 10) console.log(`  xato: ${item.title} — ${(e as Error).message.split("\n").pop()}`);
    }
  }
  console.log(`${apply ? "BAJARILDI" : "HISOBOT (bazaga yozilmadi)"}: jami ${items.length} ta moslanmagan`);
  console.log(`  bazadagi kitobga ulanadi:   ${counts.link}`);
  console.log(`  yangi kitob yaratiladi:     ${counts.create}`);
  console.log(`  o'tkaziladi — diniy:        ${counts.religious}`);
  console.log(`  o'tkaziladi — kitob emas:   ${counts.nonbook}`);
  console.log(`  o'tkaziladi — ISBN va muallifsiz: ${counts.noinfo} (bittalab chiqarish mumkin)`);
  if (counts.error) console.log(`  xato:                       ${counts.error}`);
  for (const [k, list] of Object.entries(samples)) if (list.length) console.log(`\n${k} (namuna):\n  ${list.join("\n  ")}`);
}

main().finally(() => prisma.$disconnect());
