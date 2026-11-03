/**
 * Tadqiqot uchun sahifalarni xushmuomala yuklab olish (robots.txt + pauza).
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/fetch-pages.ts <chiqish-papka> <url> [url...]
 *   yoki URL'lar ro'yxati stdin orqali (har qatorda bitta).
 * Fayl nomi: URL'ning xavfsiz ko'rinishi. Natija: <papka>/index.tsv (status, url, fayl).
 */
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PoliteFetcher } from "../lib/collector/fetcher";

async function main() {
  const [out, ...args] = process.argv.slice(2);
  if (!out) throw new Error("chiqish papkasi kerak");
  mkdirSync(out, { recursive: true });
  let urls = args;
  if (!urls.length && !process.stdin.isTTY) urls = readFileSync(0, "utf8").split(/\s+/).filter(Boolean);
  const f = new PoliteFetcher({ minDelayMs: Number(process.env.DELAY_MS ?? 3000), retries: 1 });
  for (const url of urls) {
    const file = url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) + ".html";
    if (existsSync(join(out, file))) continue;
    try {
      const res = await f.get(url);
      writeFileSync(join(out, file), res.body);
      appendFileSync(join(out, "index.tsv"), `${res.status}\t${url}\t${file}\n`);
      console.log(res.status, url);
    } catch (e) {
      appendFileSync(join(out, "index.tsv"), `ERR\t${url}\t${(e as Error).message}\n`);
      console.log("ERR", url, (e as Error).message);
    }
  }
}
main();
