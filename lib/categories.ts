/**
 * Buqancha katalogi bo'limlari. Sotuvchilarning o'z bo'limlari (Qamar: /katalog/<slug>,
 * Barakot: /catalog/<slug>) shu ro'yxatga moslanadi. Diniy, to'plam va sovg'a bo'limlari olinmaydi.
 */
export type Category = {
  slug: string;
  name: string;
  /** qisqa tavsif (bo'lim sahifasi va meta description uchun) */
  about: string;
  /** ichki bo'lim bo'lsa — asosiy bo'lim (masalan, O'zbek adabiyoti → Badiiy adabiyot) */
  parent?: string;
};

/**
 * Til bo'limlari (katalogning birinchi darajasi). Kitob tili nashrlaridan: bitta o'zbekcha nashri bo'lsa —
 * o'zbekcha; aks holda barcha nashrlari shu tilda bo'lsa — o'sha til.
 */
export type Language = { slug: string; code: "uz" | "ru" | "en"; name: string; about: string };
export const LANGUAGES: Language[] = [
  { slug: "ozbek-tilida", code: "uz", name: "O'zbek tilida", about: "O'zbek tilidagi kitoblar (lotin va kirill)" },
  { slug: "rus-tilida", code: "ru", name: "Rus tilida", about: "Rus tilidagi kitoblar" },
  { slug: "ingliz-tilida", code: "en", name: "Ingliz tilida", about: "Ingliz tilidagi kitoblar" },
];
export const LANGUAGE_BY_SLUG = new Map(LANGUAGES.map((l) => [l.slug, l]));

export const CATEGORIES: Category[] = [
  { slug: "badiiy", name: "Badiiy adabiyot", about: "Roman, qissa, hikoya, she'riyat — o'zbek va jahon adabiyoti" },
  { slug: "ozbek-adabiyoti", name: "O'zbek adabiyoti", about: "O'zbek yozuvchilarining roman, qissa va hikoyalari", parent: "badiiy" },
  { slug: "jahon-adabiyoti", name: "Jahon adabiyoti", about: "Jahon adabiyoti durdonalari", parent: "badiiy" },
  { slug: "detektiv-fantastika", name: "Detektiv va fantastika", about: "Detektiv, triller va fantastik asarlar", parent: "badiiy" },
  { slug: "sheriyat", name: "She'riyat", about: "She'rlar to'plamlari va dostonlar", parent: "badiiy" },
  { slug: "bolalar", name: "Bolalar adabiyoti", about: "Ertaklar, bolalar kitoblari va boshqotirmalar" },
  { slug: "badiiy-bolmagan", name: "Badiiy bo'lmagan", about: "Ilmiy-ommabop va ma'rifiy kitoblar" },
  { slug: "psixologiya", name: "Psixologiya va shaxsiy rivojlanish", about: "Psixologiya, motivatsiya va o'z ustida ishlash" },
  { slug: "biznes", name: "Biznes va moliya", about: "Biznes, moliya, marketing va iqtisodiyot" },
  { slug: "tarix", name: "Tarix va ijtimoiy fanlar", about: "Tarix, siyosat va huquq" },
  { slug: "falsafa", name: "Falsafa va madaniyat", about: "Falsafa, madaniyat va san'at" },
  { slug: "ilm-fan", name: "Ilm-fan va texnika", about: "Fan, texnika va axborot texnologiyalari" },
  { slug: "talim", name: "Darsliklar va abituriyentlar", about: "Darsliklar, test to'plamlari va o'quv qo'llanmalari" },
  { slug: "chet-tillari", name: "Chet tillarini o'rganish", about: "Ingliz va boshqa tillarni o'rganish uchun kitoblar" },
  { slug: "lugatlar", name: "Lug'at va ensiklopediyalar", about: "Lug'atlar, ma'lumotnomalar va ensiklopediyalar" },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** Ichki bo'limlar bilan birga asosiy bo'limlar ham qo'shiladi (O'zbek adabiyoti → Badiiy adabiyot ham). */
export function withParents(slugs: string[]): string[] {
  const out = new Set(slugs.filter((s) => CATEGORY_BY_SLUG.has(s)));
  for (const s of [...out]) {
    const p = CATEGORY_BY_SLUG.get(s)?.parent;
    if (p) out.add(p);
  }
  return [...out];
}

const SKIP = /diniy|quron|qur-on|duolar|rasululloh|tafsir|toplam|sovga|jurnal|qurollari|kanstovar|plakat|chiqargich|qogoz/;

/** Bitta sotuvchi bo'limi → bizning bo'limlarimiz (bir nechta bo'lishi mumkin). */
export function mapSellerCategory(raw: string): string[] {
  const s = raw.toLowerCase();
  if (SKIP.test(s)) return [];
  const out = new Set<string>();
  const kids = /(^|-)(bola|bolalar|ertak|ertaklar|boshqotirma|boshqotirmalar)(-|$)/.test(s);
  if (kids) out.add("bolalar");
  if (!kids && /ozbek-.*adabiyot/.test(s)) out.add("ozbek-adabiyoti");
  if (!kids && /jahon-adabiyot/.test(s)) out.add("jahon-adabiyoti");
  if (/detektiv|fantast|triller|priklyuchen/.test(s)) out.add("detektiv-fantastika");
  if (/sheriyat|sherlar|poeziya/.test(s)) out.add("sheriyat");
  if (!kids && /badiiy-adabiyot|khudozhestvennaya|sovremennaya-proza|klassika|romany/.test(s)) out.add("badiiy");
  if (/psixolog|psikhologiya|shaxsiy-rivoj|lichnostnyj|motivats/.test(s)) out.add("psixologiya");
  if (/biznes|moliya|iqtisod|marketing|finansy|ekonomika|menedzhment|prodazhi|startap/.test(s)) out.add("biznes");
  if (/tarix|siyosi|huquq|ijtimoiy/.test(s)) out.add("tarix");
  if (/falsafa|madaniyat|kultura|filosof/.test(s)) out.add("falsafa");
  if (/badiiy-bolmagan|marifiy-asar|nekhudozhestvennaya|nauchno-populyarnaya|poznavatelnaya|publitsistika|biografi/.test(s)) out.add("badiiy-bolmagan");
  if (/ilm-fan|ilmiy|texnik|informatsionnye/.test(s)) out.add("ilm-fan");
  if (/abiturient|darslik|oquv-qollanma|oquv-adabiyot|testlar|ilmiy-va-oquv/.test(s)) out.add("talim");
  if (/chet-til|ingliz-tili$|til-organ|tilini-organ|samouchitel/.test(s)) out.add("chet-tillari");
  if (/lugat|entsiklopedi|ensiklopedi/.test(s)) out.add("lugatlar");
  return Array.from(out);
}

export function mapSellerCategories(raw: string[] | undefined): string[] {
  return withParents(Array.from(new Set((raw ?? []).flatMap(mapSellerCategory))));
}

/** Sotuvchi bo'limidan nashr tili ("rus-tilida" → ru): kitob bo'limiga emas, nashr tiliga yoziladi. */
export function languageFromSellerCategories(raw: string[] | undefined): string | null {
  for (const r of raw ?? []) {
    if (/rus-tilida|na-russkom/.test(r)) return "ru";
    if (/ingliz-tilida|in-english/.test(r)) return "en";
    if (/arab-tilida/.test(r)) return "ar";
  }
  return null;
}
