export const SITE_NAME = "Buqancha";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://buqancha.uz").replace(/\/$/, "");

/**
 * Google indeksatsiyasi. Hozir narxlar namunaviy, shuning uchun sukut bo'yicha
 * o'chiq (robots.txt va meta noindex). Haqiqiy narxlar kiritilgach
 * ALLOW_INDEXING=true qiling.
 */
export const ALLOW_INDEXING = process.env.ALLOW_INDEXING === "true";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
