import { test } from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { docxRows, rowsToCsv, xlsxRows } from "./office.ts";

test("Excel: umumiy satrlar, inline matn, raqamlar, bo'sh kataklar", () => {
  const shared = `<sst><si><t>isbn</t></si><si><t>nom</t></si><si><t>narx</t></si><si><r><t>O'tkan </t></r><r><t>kunlar</t></r></si></sst>`;
  const sheet = `<worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row r="2"><c r="A2"><v>9789943223837</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>45000</v></c></row>
    <row r="3"><c r="B3" t="inlineStr"><is><t>Shum bola &amp; boshqalar</t></is></c><c r="C3"><v>12000</v></c></row>
  </sheetData></worksheet>`;
  const zip = zipSync({ "xl/sharedStrings.xml": strToU8(shared), "xl/worksheets/sheet1.xml": strToU8(sheet) });
  assert.deepEqual(xlsxRows(zip), [
    ["isbn", "nom", "narx"],
    ["9789943223837", "O'tkan kunlar", "45000"],
    ["", "Shum bola & boshqalar", "12000"],
  ]);
});

test("Word: eng katta jadval qatorlari", () => {
  const cell = (t: string) => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
  const doc = `<w:document><w:body><w:p><w:r><w:t>Narxlar</w:t></w:r></w:p>
    <w:tbl><w:tr>${cell("nom")}${cell("narx")}</w:tr><w:tr>${cell("Navoiy")}${cell("30000")}</w:tr><w:tr>${cell("Ufq")}${cell("50000")}</w:tr></w:tbl>
  </w:body></w:document>`;
  const zip = zipSync({ "word/document.xml": strToU8(doc) });
  assert.deepEqual(docxRows(zip), [["nom", "narx"], ["Navoiy", "30000"], ["Ufq", "50000"]]);
});

test("CSV'ga aylantirish: vergul va qo'shtirnoq", () => {
  assert.equal(rowsToCsv([["nom", "narx"], ['Ali "va" Nino, 2-nashr', "62000"]]), 'nom,narx\n"Ali ""va"" Nino, 2-nashr",62000');
});
