import { unstable_cache } from "next/cache";

/**
 * Ma'lumotlar keshi: sahifa so'rovlari bazaga har safar bormaydi (Neon bepul tarifida hisoblash vaqti cheklangan).
 * Narxlar kechasi yangilanadi, shuning uchun 1 soat yetarli; admin/hamkor o'zgarishi esa `revalidateTag` bilan
 * darhol tozalanadi. Next keshi JSON saqlaydi — sanalar (Date) belgilab saqlanib, qaytarishda tiklanadi.
 */
export const CATALOG_TAG = "catalog";
const DATE = "__date";

function encode(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, val) {
    const raw = this[key];
    return raw instanceof Date ? { [DATE]: raw.toISOString() } : val;
  });
}

function decode<T>(text: string): T {
  return JSON.parse(text, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v) && DATE in v && Object.keys(v).length === 1 ? new Date(v[DATE]) : v,
  ) as T;
}

// kesh deploy'lar orasida saqlanadi — kod (so'rov) o'zgarsa eski natija qolmasligi uchun kalitda versiya
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.CACHE_VERSION ?? "local").slice(0, 12);

export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, revalidate = 3600) {
  const inner = unstable_cache(async (...args: A) => encode(await fn(...args)), [key, VERSION], { revalidate, tags: [CATALOG_TAG] });
  return async (...args: A): Promise<R> => decode<R>(await inner(...args));
}
