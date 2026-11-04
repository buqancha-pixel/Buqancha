/**
 * Narx matnini so'mdagi butun songa o'giradi.
 * "39 000 so'm", "39,000", "39000.00", "39 000,00 UZS", 39000 → 39000.
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s  ]/g, "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  // oxirgi ajratkichdan keyin 1–2 raqam bo'lsa — kasr qismi (tiyin)
  const m = s.match(/^(.*?)[.,](\d{1,2})$/);
  if (m) s = m[1];
  s = s.replace(/[.,]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Ishonchli narx oralig'i (so'm). Undan tashqaridagilar rad etiladi. */
export const MIN_PRICE = 1_000;
export const MAX_PRICE = 10_000_000;

/** Bir martada shuncha nisbatdan ko'p o'zgarish shubhali hisoblanadi. */
export const MAX_CHANGE_RATIO = 0.7;

export type PriceVerdict = "ok" | "reject" | "flag";

export function checkPrice(next: number, current: number | null): PriceVerdict {
  if (next < MIN_PRICE || next > MAX_PRICE) return "reject";
  if (current && Math.abs(next - current) / current > MAX_CHANGE_RATIO) return "flag";
  return "ok";
}
