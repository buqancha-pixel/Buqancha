/**
 * Sotuvchilar katalogini (prisma/data/sellers.ts) bazaga qo'shish/yangilash.
 * Takliflar, narxlar va yig'ish sozlamalariga tegilmaydi.
 *   npm run db:sellers            — bazaga yozish
 *   npm run db:sellers -- --csv   — docs/sotuvchilar.csv faylini yangilash
 */
import { writeFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { SELLERS } from "../prisma/data/sellers";

const TYPE = { STORE: "do'kon", PUBLISHER: "nashriyot", MARKETPLACE: "marketpleys" } as const;

function csv() {
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["nom", "turi", "shahar", "sayt", "ijtimoiy tarmoq", "manzil", "tavsif", "manbalar"],
    ...SELLERS.map((s) => [s.name, TYPE[s.type], s.city, s.website, s.social, s.address, s.description, s.sources.join(" ")]),
  ];
  writeFileSync("docs/sotuvchilar.csv", "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n") + "\n");
  console.log(`docs/sotuvchilar.csv: ${SELLERS.length} ta yozuv`);
}

async function main() {
  if (process.argv.includes("--csv")) return csv();
  let created = 0;
  let updated = 0;
  for (const s of SELLERS) {
    const data = {
      name: s.name, type: s.type, city: s.city, website: s.website, social: s.social ?? null,
      address: s.address ?? null, description: s.description, sources: s.sources,
      searchUrlTemplate: s.searchUrlTemplate ?? null,
      ...(s.collector ? { collector: s.collector } : {}),
      ...(s.sitemapUrls ? { sitemapUrls: s.sitemapUrls } : {}),
      ...(s.productUrlPattern ? { productUrlPattern: s.productUrlPattern } : {}),
    };
    const exists = await prisma.seller.findUnique({ where: { slug: s.slug }, select: { id: true } });
    await prisma.seller.upsert({ where: { slug: s.slug }, create: { slug: s.slug, ...data }, update: data });
    if (exists) updated++;
    else created++;
  }
  console.log(`Sotuvchilar: ${created} ta yangi, ${updated} ta yangilandi (jami katalogda ${SELLERS.length}).`);
}

main().finally(() => prisma.$disconnect());
