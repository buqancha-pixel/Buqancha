export const SITE_NAME = "Buqancha";
// O'z domeningiz ulanmaguncha Vercel bergan manzil (masalan buqancha.vercel.app) ishlatiladi
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://buqancha.uz").replace(/\/$/, "");

/**
 * Google indeksatsiyasi. Sukut bo'yicha o'chiq (robots.txt va meta noindex).
 * Sayt tayyor bo'lgach (yaxshisi o'z domeni ulangach) ALLOW_INDEXING=true qiling.
 */
export const ALLOW_INDEXING = process.env.ALLOW_INDEXING === "true";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
