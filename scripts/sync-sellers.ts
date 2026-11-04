/**
 * Sotuvchilar katalogini (prisma/data/sellers.ts) bazaga qo'shish/yangilash.
 * Yangi sotuvchilar to'liq qo'shiladi; mavjudlarida yig'ish sozlamalari yangilanadi, nom/manzil/sayt kabi
 * maydonlar esa faqat bo'sh bo'lsa to'ldiriladi (admin paneldagi tahrirlar saqlanadi). Narxlarga tegilmaydi.
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
      ...(s.listingUrls ? { listingUrls: s.listingUrls } : {}),
      ...(s.productUrlPattern ? { productUrlPattern: s.productUrlPattern } : {}),
    };
    const exists = await prisma.seller.findUnique({ where: { slug: s.slug } });
    if (!exists) {
      await prisma.seller.create({ data: { slug: s.slug, ...data } });
      created++;
      continue;
    }
    // mavjud sotuvchi: narx yig'ish sozlamalari fayldan olinadi, ma'lumotnoma maydonlari esa
    // faqat bo'sh bo'lsa to'ldiriladi — admin panelda kiritilgan o'zgarishlar ustidan yozilmaydi
    const fillIfEmpty = <K extends keyof typeof exists>(k: K, v: unknown) => (exists[k] == null || exists[k] === "" ? { [k]: v } : {});
    await prisma.seller.update({
      where: { slug: s.slug },
      data: {
        searchUrlTemplate: data.searchUrlTemplate,
        sources: data.sources,
        ...(s.collector ? { collector: s.collector } : {}),
        ...(s.sitemapUrls ? { sitemapUrls: s.sitemapUrls } : {}),
        ...(s.listingUrls ? { listingUrls: s.listingUrls } : {}),
        ...(s.productUrlPattern ? { productUrlPattern: s.productUrlPattern } : {}),
        ...fillIfEmpty("website", data.website),
        ...fillIfEmpty("social", data.social),
        ...fillIfEmpty("address", data.address),
        ...fillIfEmpty("description", data.description),
      },
    });
    updated++;
  }
  console.log(`Sotuvchilar: ${created} ta yangi, ${updated} ta yangilandi (jami katalogda ${SELLERS.length}).`);
}

main().finally(() => prisma.$disconnect());
