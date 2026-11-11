/**
 * Hamkorlar uchun Excel shablon: public/buqancha-namuna.xlsx
 *   npx tsx scripts/make-template.ts
 */
import { writeFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";

const rows = [
  ["Kitob nomi", "Muallif", "ISBN", "Nashriyot", "Narx (so'm)", "Mavjud", "Havola"],
  // namuna qatorlar hech bir kitobga bog'lanmaydi (ISBN yo'q, nomi "NAMUNA") — shablon o'zgartirilmay yuklansa ham zarar yo'q
  ["NAMUNA — bu qatorni o'chirib, o'z kitobingizni yozing", "Muallif ismi", "", "Nashriyotingiz nomi", "45000", "ha", "https://saytingiz.uz/kitob"],
  ["NAMUNA — sotuvda yo'q kitob", "Muallif ismi", "", "Nashriyotingiz nomi", "48000", "yo'q", ""],
];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const col = (i: number) => String.fromCharCode(65 + i);
const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="3" width="17" customWidth="1"/><col min="4" max="4" width="24" customWidth="1"/><col min="5" max="5" width="13" customWidth="1"/><col min="6" max="6" width="9" customWidth="1"/><col min="7" max="7" width="38" customWidth="1"/></cols>
<sheetData>${rows
  .map(
    (r, ri) =>
      `<row r="${ri + 1}">${r
        .map((v, ci) =>
          ci === 4 && ri > 0 ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`,
        )
        .join("")}</row>`,
  )
  .join("")}</sheetData></worksheet>`;
const files = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Kitoblar" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  "xl/worksheets/sheet1.xml": sheet,
};
writeFileSync("public/buqancha-namuna.xlsx", zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
console.log("public/buqancha-namuna.xlsx yozildi");
