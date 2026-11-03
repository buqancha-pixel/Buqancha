export const SITE_NAME = "Buqancha";
// O'z domeningiz ulanmaguncha Vercel bergan manzil (masalan buqancha.vercel.app) ishlatiladi
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://buqancha.uz").replace(/\/$/, "");

/**
 * Google indeksatsiyasi. Vercel'dagi asosiy (production) saytda yoqiq; sinov deploy'lari
 * va mahalliy ishga tushirishda o'chiq (robots.txt Disallow va meta noindex).
 * ALLOW_INDEXING=true/false bilan majburan yoqish yoki o'chirish mumkin.
 */
const indexingEnv = process.env.ALLOW_INDEXING;
export const ALLOW_INDEXING = indexingEnv ? indexingEnv === "true" : process.env.VERCEL_ENV === "production";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Hamkorlik bo'yicha aloqa (saytda shaxsiy ma'lumot saqlanmasligi uchun forma o'rniga). */
export const PARTNER_TELEGRAM = "Shohruh_Fayzullayev";
