/**
 * O'zbekcha matnni qidiruv uchun yagona ko'rinishga keltirish.
 *
 * "Ўткан кунлар", "O'tkan kunlar", "O‘tkan kunlar", "Ötkan kunlar"
 * va "otkan kunlar" — hammasi "otkan kunlar" bo'ladi.
 */

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

const CYR_VOWELS = new Set("аеёиоуэюяў");

// Turkcha/yangi lotin variantlari va boshqa diakritikalar
const LATIN_SPECIAL: Record<string, string> = {
  ö: "o", ô: "o", ò: "o", ó: "o", õ: "o",
  ğ: "g", ǵ: "g", ĝ: "g",
  ş: "sh", ș: "sh", š: "sh", ŝ: "sh",
  ç: "ch", č: "ch", ĉ: "ch",
  ı: "i", ü: "u", ñ: "ng",
};

// Barcha tutuq belgisi variantlari: ' ‘ ’ ʻ ʼ ` ´ ʹ ′
const APOSTROPHES = /['‘’ʻʼ`´ʹ′‛]/g;

/** Kirill harflarini lotinga o'giradi (o'zbek qoidasi bo'yicha). */
export function cyrillicToLatin(input: string): string {
  let out = "";
  const chars = Array.from(input);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lower = ch.toLowerCase();
    if (!(lower in CYRILLIC)) {
      out += ch;
      continue;
    }
    // "е" so'z boshida yoki unlidan keyin "ye" bo'ladi: Ер → Yer
    if (lower === "е") {
      const prev = chars[i - 1]?.toLowerCase();
      const atStart = !prev || !/[\p{L}]/u.test(prev);
      if (atStart || CYR_VOWELS.has(prev) || prev === "ъ" || prev === "ь") {
        out += "ye";
        continue;
      }
    }
    out += CYRILLIC[lower];
  }
  return out;
}

/**
 * Asosiy normallashtirish: kichik harf, kirill → lotin, maxsus harflar,
 * tutuq belgilarini olib tashlash, bo'shliqlarni siqish.
 */
export function normalize(input: string): string {
  let s = input.normalize("NFC").toLowerCase();
  s = cyrillicToLatin(s);
  s = Array.from(s)
    .map((c) => LATIN_SPECIAL[c] ?? c)
    .join("");
  // o' / g' dagi tutuqni va ʻ belgisini olib tashlaymiz
  s = s.replace(APOSTROPHES, "");
  // qolgan diakritikalarni tozalash
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // harf va raqamdan boshqasi — bo'shliq
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  return s;
}

/**
 * Qidiruv kaliti: normalize() + ko'p uchraydigan imlo chalkashliklari
 * (x/h, q/k, ikkilangan harflar) bir xil deb olinadi.
 * Masalan: "Xamsa" ≈ "Hamsa", "Qodiriy" ≈ "Kodiriy", "Abdulla" ≈ "Abdula".
 */
export function searchKey(input: string): string {
  return normalize(input)
    .replace(/x/g, "h")
    .replace(/q/g, "k")
    .replace(/([a-z])\1+/g, "$1");
}

/** Bir nechta maydonlardan bitta qidiruv kalitini yig'adi. */
export function buildSearchKey(...parts: Array<string | null | undefined>): string {
  const keys = parts.filter(Boolean).map((p) => searchKey(p as string));
  return ` ${Array.from(new Set(keys)).join(" | ")} `;
}

/** Lotin nomdan URL uchun slug. */
export function slugify(input: string): string {
  return normalize(input).replace(/\s+/g, "-");
}
