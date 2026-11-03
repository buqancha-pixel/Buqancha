import type { SellerType, OfferSource } from "@prisma/client";

/** 39000 → "39 000" (oddiy bo'shliq bilan, har qanday brauzerda bir xil). */
export function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatPrice(n: number): string {
  return `${formatNumber(n)} so'm`;
}

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

export function formatDate(d: Date): string {
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export function formatRelative(d: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "bugun";
  if (days === 1) return "kecha";
  if (days < 30) return `${days} kun oldin`;
  return formatDate(d);
}

export const SELLER_TYPE_LABEL: Record<SellerType, string> = {
  STORE: "Do'kon",
  PUBLISHER: "Nashriyot",
  MARKETPLACE: "Marketpleys",
};

export const SELLER_TYPE_PLURAL: Record<SellerType, string> = {
  STORE: "Do'konlar",
  PUBLISHER: "Nashriyotlar",
  MARKETPLACE: "Marketpleyslar",
};

/** URL parametri ↔ tur */
export const SELLER_TYPE_PARAM: Record<string, SellerType> = {
  dokon: "STORE",
  nashriyot: "PUBLISHER",
  marketpleys: "MARKETPLACE",
};

export const SOURCE_LABEL: Record<OfferSource, string> = {
  PARTNER: "hamkor",
  AUTO: "avtomatik",
  MANUAL: "qo'lda",
};

export function plural(n: number, word: string): string {
  return `${formatNumber(n)} ta ${word}`;
}
