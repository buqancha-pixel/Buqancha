import type { CollectedItem } from "../types.ts";
import { parsePrice } from "../price.ts";
import { normalizeIsbn } from "../isbn.ts";

/**
 * Hamkor feed'i. Ustunlar (CSV sarlavhasi yoki JSON kalitlari):
 *   isbn, title (nom), author (muallif), publisher (nashriyot),
 *   price (narx), in_stock (mavjud), url (havola), sku
 * Majburiy: title va price. in_stock: 1/0, true/false, ha/yo'q, bor/yo'q.
 */

const ALIASES: Record<string, keyof RawRow> = {
  // o'zbekcha, inglizcha va ruscha ustun nomlari (Excel/Word jadvallari uchun)
  isbn: "isbn", "isbn_raqami": "isbn", "shtrix_kod": "isbn", barcode: "isbn", "штрихкод": "isbn",
  title: "title", nom: "title", nomi: "title", name: "title", kitob: "title", "kitob_nomi": "title", "название": "title", "наименование": "title",
  author: "author", muallif: "author", muallifi: "author", "автор": "author",
  publisher: "publisher", nashriyot: "publisher", nashriyoti: "publisher", "издательство": "publisher",
  price: "price", narx: "price", narxi: "price", "narx_so'm": "price", "narxi_so'm": "price", "цена": "price", "стоимость": "price",
  in_stock: "in_stock", instock: "in_stock", stock: "in_stock", mavjud: "in_stock", mavjudligi: "in_stock", available: "in_stock", "наличие": "in_stock",
  url: "url", havola: "url", link: "url", "ссылка": "url",
  sku: "sku", id: "sku", artikul: "sku", "артикул": "sku",
};

type RawRow = {
  isbn?: string; title?: string; author?: string; publisher?: string;
  price?: string | number; in_stock?: string | number | boolean; url?: string; sku?: string;
};

export type FeedResult = { items: CollectedItem[]; errors: string[] };

export function parseFeed(body: string, format?: "csv" | "json"): FeedResult {
  const fmt = format ?? (/^\s*[\[{]/.test(body) ? "json" : "csv");
  const rows = fmt === "json" ? jsonRows(body) : csvRows(body);
  const items: CollectedItem[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const line = fmt === "csv" ? i + 2 : i + 1;
    const title = String(row.title ?? "").trim();
    const price = parsePrice(row.price);
    if (!title) return errors.push(`${line}-qator: nom (title) yo'q`);
    if (!price) return errors.push(`${line}-qator: narx noto'g'ri (${row.price ?? ""})`);
    const isbn = normalizeIsbn(row.isbn ? String(row.isbn) : undefined) ?? undefined;
    if (row.isbn && !isbn) errors.push(`${line}-qator: ISBN noto'g'ri (${row.isbn}), nom bo'yicha moslanadi`);
    const url = row.url ? String(row.url).trim() : undefined;
    items.push({
      key: (row.sku && String(row.sku).trim()) || url || isbn || title.toLowerCase(),
      title,
      author: row.author ? String(row.author).trim() : undefined,
      publisher: row.publisher ? String(row.publisher).trim() : undefined,
      isbn,
      price,
      inStock: parseBool(row.in_stock),
      url,
    });
  });
  return { items, errors };
}

function parseBool(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  return !/^(0|false|no|yo'?q|yoq|нет|mavjud emas|out)$/i.test(String(v).trim());
}

function mapKeys(obj: Record<string, unknown>): RawRow {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    // "Narx (so'm)", "Kitob nomi:", "ISBN raqami" — qavslar va tinish belgilari e'tiborga olinmaydi
    const norm = k.toLowerCase().replace(/\(.*?\)/g, "").replace(/[:*.]/g, "").trim().replace(/[\s-]+/g, "_");
    const key = ALIASES[norm];
    if (key && row[key] === undefined) row[key] = v;
  }
  return row as RawRow;
}

function jsonRows(body: string): RawRow[] {
  const data = JSON.parse(body);
  const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return list.filter((x: unknown) => x && typeof x === "object").map(mapKeys);
}

/** RFC 4180 CSV: qo'shtirnoq, ichki vergul va qator ko'chishi; ajratkich , yoki ; */
export function parseCsv(body: string): string[][] {
  const text = body.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

function csvRows(body: string): RawRow[] {
  const [header, ...rest] = parseCsv(body);
  if (!header) return [];
  return rest.map((cells) => mapKeys(Object.fromEntries(header.map((h, i) => [h, cells[i]?.trim()]))));
}
