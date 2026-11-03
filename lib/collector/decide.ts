import { checkPrice } from "./price.ts";

export type CurrentOffer = { price: number; inStock: boolean; isSample: boolean } | null;

export type Decision =
  | { action: "reject"; reason: string }
  | { action: "create" }
  | { action: "flag"; reason: string }
  | { action: "update"; priceChanged: boolean; stockChanged: boolean }
  | { action: "unchanged" };

/** Yangi narxni mavjud taklifga qanday qo'llashni hal qiladi (sof funksiya). */
export function decide(current: CurrentOffer, next: { price: number; inStock: boolean }): Decision {
  // namunaviy narx bilan solishtirish ma'nosiz — faqat oraliq tekshiriladi
  const base = current && !current.isSample ? current.price : null;
  const verdict = checkPrice(next.price, base);
  if (verdict === "reject") return { action: "reject", reason: `narx ishonchli oraliqdan tashqarida: ${next.price}` };
  if (!current) return { action: "create" };
  if (verdict === "flag") return { action: "flag", reason: `narx keskin o'zgardi: ${current.price} → ${next.price}` };
  if (current.isSample) return { action: "update", priceChanged: true, stockChanged: current.inStock !== next.inStock };
  const priceChanged = current.price !== next.price;
  const stockChanged = current.inStock !== next.inStock;
  return priceChanged || stockChanged ? { action: "update", priceChanged, stockChanged } : { action: "unchanged" };
}
