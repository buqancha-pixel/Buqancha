/** ISBN'ni tozalaydi va tekshiradi. ISBN-10 ISBN-13 ga o'giriladi. Noto'g'ri bo'lsa null. */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/^ISBN(-1[03])?:?\s*/, "").replace(/[\s-]/g, "");
  if (/^\d{13}$/.test(s)) return isValid13(s) ? s : null;
  if (/^\d{9}[\dX]$/.test(s)) return isValid10(s) ? to13(s) : null;
  return null;
}

function isValid13(s: string): boolean {
  const sum = Array.from(s).reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

function isValid10(s: string): boolean {
  const sum = Array.from(s).reduce((acc, d, i) => acc + (d === "X" ? 10 : Number(d)) * (10 - i), 0);
  return sum % 11 === 0;
}

function to13(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  const sum = Array.from(core).reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}
