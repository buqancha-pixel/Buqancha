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
  errors: string[];
};

export function emptyStats(): RunStats {
  return { seen: 0, created: 0, updated: 0, unchanged: 0, unmatched: 0, flagged: 0, rejected: 0, markedOut: 0, errors: [] };
}
