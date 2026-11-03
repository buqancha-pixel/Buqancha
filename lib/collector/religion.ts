/**
 * Diniy adabiyotni aniqlash. Bunday kitoblar avtomatik import qilinmaydi —
 * ularni sayt egasi qo'lda kiritadi.
 *
 * Asosiy belgi — do'konning o'z kategoriyasi (Qamar: "diniy-marifiy-adabiyot", "quron";
 * Barakot: "Bo'lim" havolasi). Qo'shimcha — nom va nashriyotdagi aniq so'zlar.
 */
import { searchKey } from "../normalize.ts";

const CATEGORY_RE = /(^|-)(diniy|din|islom|islomiy|quron|qur-on|hadis|hadislar|aqida|fiqh|tasavvuf|duolar|namoz|religi|religion)(-|$)/;

// searchKey ko'rinishida (x→h, q→k, ikkilangan harflar bitta)
const TITLE_WORDS = new Set(
  [
    "hadis", "hadislar", "hadislari", "qur'on", "qur'oni", "quron", "namoz", "namozi", "payg'ambar", "payg'ambarimiz",
    "payg'ambarlar", "rasululloh", "rasulullohning", "alloh", "allohning", "allohga", "islom", "islomiy", "islomda",
    "tafsir", "tafsiri", "sahoba", "sahobalar", "roziyallohu", "sollallohu", "alayhissalom", "zikr", "fiqh", "aqida",
    "aqidasi", "sunnat", "sunnati", "zakot", "tavhid", "tasavvuf", "musulmon", "musulmonlar", "ramazon", "duolar",
    "duo", "iymon", "iymonning", "imon", "haj", "umra", "mo'min", "mo'minlar", "shariat", "sunniy", "salaf",
    "din", "diniy", "avliyo", "avliyolar", "avliyolari", "imom", "imomi", "masjid", "oxirat", "sahih",
  ].map((w) => searchKey(w)),
);
const PUBLISHER_RE = /\b(hilol[\s-]?nashr|hilolnashr|azon kitoblari|azon)\b/i;

/** Sotuvchi sahifasidagi kategoriya slug'lari (Qamar: /katalog/<slug>, Barakot: /catalog/<slug>?...). */
export function extractCategories(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/\/(?:katalog|catalog)\/([a-z0-9-]{3,60})(?=["?\\/])/g)) out.add(m[1]);
  return Array.from(out);
}

export function isReligiousCategory(slugs: string[] | undefined): boolean {
  return !!slugs?.some((s) => CATEGORY_RE.test(s));
}

// ko'p so'zli aniq iboralar (searchKey ko'rinishida)
const TITLE_PHRASES = ["saodat asri", "tazkirat ul"].map((p) => searchKey(p));

export function isReligiousText(title: string, publisher?: string | null): boolean {
  if (publisher && PUBLISHER_RE.test(publisher)) return true;
  const key = searchKey(title);
  if (TITLE_PHRASES.some((p) => ` ${key} `.includes(` ${p} `))) return true;
  return key.split(" ").some((t) => TITLE_WORDS.has(t));
}

export function isReligious(item: { title: string; publisher?: string | null; categories?: string[] }): boolean {
  return isReligiousCategory(item.categories) || isReligiousText(item.title, item.publisher);
}
