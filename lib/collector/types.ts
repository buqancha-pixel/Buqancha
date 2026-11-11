/** Manbadan (feed yoki sahifa) olingan bitta mahsulot. */
export type CollectedItem = {
  /** sotuvchi tomonidagi barqaror kalit: havola, SKU yoki ISBN */
  key: string;
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  /** so'mda, butun son */
  price: number;
  inStock: boolean;
  url?: string;
  /** nashr ma'lumotlari (bo'lsa) — yangi nashr yaratishda ishlatiladi */
  pages?: number;
  cover?: "qattiq" | "yumshoq";
  year?: number;
  /** ISO til kodi, masalan "uz", "ru", "en" */
  language?: string;
  /** muqova rasmi havolasi (sotuvchi saytida) */
  image?: string;
  /** sotuvchi kategoriyalari (slug) */
  categories?: string[];
  /** muqobil nom (masalan kirillcha) */
  titleAlt?: string;
  /** muallif aslida brend maydonidan olingan (ishonchsiz) */
  authorFromBrand?: boolean;
};

export type RunStats = {
  seen: number;
  created: number;
  updated: number;
  unchanged: number;
  unmatched: number;
  flagged: number;
  rejected: number;
  markedOut: number;
  newEditions: number;
  newBooks: number;
  /** diniy adabiyot — o'tkazib yuborildi yoki olib tashlandi */
  religious: number;
  errors: string[];
};

export function emptyStats(): RunStats {
  return { seen: 0, created: 0, updated: 0, unchanged: 0, unmatched: 0, flagged: 0, rejected: 0, markedOut: 0, newEditions: 0, newBooks: 0, religious: 0, errors: [] };
}
