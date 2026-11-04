/**
 * Buqancha katalogi bo'limlari. Sotuvchilarning o'z bo'limlari (Qamar: /katalog/<slug>,
 * Barakot: /catalog/<slug>) shu ro'yxatga moslanadi. Diniy, to'plam va sovg'a bo'limlari olinmaydi.
 */
export type Category = {
  slug: string;
  name: string;
  /** qisqa tavsif (bo'lim sahifasi va meta description uchun) */
  about: string;
  /** til bo'limi: shu tildagi nashrlari bor kitoblar ham kiradi */
  language?: string;
};

export const CATEGORIES: Category[] = [
  { slug: "ozbek-adabiyoti", name: "O'zbek adabiyoti", about: "O'zbek yozuvchilarining roman, qissa va hikoyalari" },
  { slug: "jahon-adabiyoti", name: "Jahon adabiyoti", about: "Jahon adabiyoti durdonalari o'zbek tilida" },
  { slug: "detektiv-fantastika", name: "Detektiv va fantastika", about: "Detektiv, triller va fantastik asarlar" },
  { slug: "sheriyat", name: "She'riyat", about: "She'rlar to'plamlari va dostonlar" },
  { slug: "bolalar", name: "Bolalar uchun", about: "Ertaklar, bolalar adabiyoti va boshqotirmalar" },
  { slug: "psixologiya", name: "Psixologiya va shaxsiy rivojlanish", about: "Psixologiya, motivatsiya va o'z ustida ishlash" },
  { slug: "biznes", name: "Biznes va moliya", about: "Biznes, moliya, marketing va iqtisodiyot" },
  { slug: "tarix", name: "Tarix va jamiyat", about: "Tarix, siyosat, huquq, falsafa va madaniyat" },
  { slug: "badiiy-bolmagan", name: "Badiiy bo'lmagan", about: "Ilmiy-ommabop va ma'rifiy kitoblar" },
  { slug: "ilm-fan", name: "Ilm-fan", about: "Fan, texnika va ensiklopediyalar" },
  { slug: "talim", name: "Darsliklar va abituriyentlar", about: "Darsliklar, test to'plamlari, lug'atlar va o'quv qo'llanmalari" },
  { slug: "chet-tillari", name: "Chet tillarini o'rganish", about: "Ingliz va boshqa tillarni o'rganish uchun kitoblar" },
  { slug: "rus-tilida", name: "Rus tilidagi kitoblar", about: "Rus tilidagi kitoblar narxlari", language: "ru" },
  { slug: "ingliz-tilida", name: "Ingliz tilidagi kitoblar", about: "Ingliz tilidagi kitoblar narxlari", language: "en" },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

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
  if (/detektiv|fantast|triller/.test(s)) out.add("detektiv-fantastika");
  if (/sheriyat|sherlar/.test(s)) out.add("sheriyat");
  if (/psixolog|shaxsiy-rivoj|motivats/.test(s)) out.add("psixologiya");
  if (/biznes|moliya|iqtisod|marketing/.test(s)) out.add("biznes");
  if (/tarix|siyosi|huquq|ijtimoiy|falsafa|madaniyat/.test(s)) out.add("tarix");
  if (/badiiy-bolmagan|marifiy-asar/.test(s)) out.add("badiiy-bolmagan");
  if (/ilm-fan|ilmiy|texnik|entsiklopediya/.test(s)) out.add("ilm-fan");
  if (/abiturient|darslik|oquv-qollanma|oquv-adabiyot|lugat|testlar/.test(s)) out.add("talim");
  if (/chet-til|ingliz-tili$|til-organ|tilini-organ/.test(s)) out.add("chet-tillari");
  if (/rus-tilida/.test(s)) out.add("rus-tilida");
  if (/ingliz-tilida/.test(s)) out.add("ingliz-tilida");
  return Array.from(out);
}

export function mapSellerCategories(raw: string[] | undefined): string[] {
  return Array.from(new Set((raw ?? []).flatMap(mapSellerCategory)));
}
