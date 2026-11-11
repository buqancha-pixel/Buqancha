/**
 * Excel (.xlsx) va Word (.docx) jadvallarini qatorlarga aylantirish — hamkorlar bitta fayl bilan
 * butun ro'yxatni yuklashi uchun. Ikkalasi ham ZIP ichidagi XML; tashqi xizmatlarsiz o'qiladi.
 * Natija CSV matniga aylantiriladi va oddiy feed tahlilchisidan o'tadi.
 */
import { strFromU8, unzipSync } from "fflate";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()],
  );
}

/** <t>…</t> (yoki <w:t>) bo'laklarini birlashtirib matn olish */
function textOf(xml: string, tag: "t" | "w:t"): string {
  const re = tag === "t" ? /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g : /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  return Array.from(xml.matchAll(re), (m) => decodeXml(m[1])).join("");
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel faylining birinchi varag'i → qatorlar */
export function xlsxRows(data: Uint8Array): string[][] {
  const files = unzipSync(data, { filter: (f) => f.name.startsWith("xl/") });
  const shared = files["xl/sharedStrings.xml"]
    ? Array.from(strFromU8(files["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g), (m) => textOf(m[1], "t"))
    : [];
  const sheetName =
    Object.keys(files)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))[0] ?? "";
  if (!sheetName) throw new Error("Excel faylida varaq topilmadi");
  const xml = strFromU8(files[sheetName]);
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cm of rm[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const inner = cm[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="(\w+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let val = "";
      if (type === "s" && v !== undefined) val = shared[Number(v)] ?? "";
      else if (type === "inlineStr") val = textOf(inner, "t");
      else if (v !== undefined) val = decodeXml(v);
      const idx = ref ? colIndex(ref) : row.length;
      row[idx] = val.trim();
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows.filter((r) => r.some((c) => c));
}

/** Word hujjatidagi eng katta jadval → qatorlar */
export function docxRows(data: Uint8Array): string[][] {
  const files = unzipSync(data, { filter: (f) => f.name === "word/document.xml" });
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("Word hujjati o'qilmadi");
  const xml = strFromU8(doc);
  const tables = Array.from(xml.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g), (tm) =>
    Array.from(tm[1].matchAll(/<w:tr[ >]([\s\S]*?)<\/w:tr>/g), (rm) =>
      Array.from(rm[1].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g), (cm) =>
        // har bir paragraf — bo'sh joy bilan
        Array.from(cm[1].matchAll(/<w:p[ >]([\s\S]*?)<\/w:p>/g), (pm) => textOf(pm[1], "w:t")).join(" ").trim(),
      ),
    ),
  );
  if (!tables.length) throw new Error("Word hujjatida jadval topilmadi — kitoblarni jadval ko'rinishida yozing");
  return tables.sort((a, b) => b.length - a.length)[0].filter((r) => r.some((c) => c));
}

/** Qatorlar → CSV matni (feed tahlilchisi uchun) */
export function rowsToCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
