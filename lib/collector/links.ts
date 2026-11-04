/** HTML sahifadagi havolalardan naqshga mos (mahsulot) manzillarni ajratadi. */
export function extractLinks(html: string, base: string, pattern: RegExp): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/g)) {
    try {
      const u = new URL(m[1].replace(/&amp;/g, "&"), base);
      u.hash = "";
      if (pattern.test(u.toString())) out.add(u.toString());
    } catch {
      /* noto'g'ri havola */
    }
  }
  return Array.from(out);
}
