import { prisma } from "@/lib/db";

/**
 * Bloger statistikasi: kunlik umumiy sonlar. Faqat son oshiriladi — IP, cookie yoki boshqa shaxsiy ma'lumot
 * saqlanmaydi. Botlar hisobga olinmaydi; bir brauzerdan kuniga bitta ko'rish (mijoz tomonda sessionStorage).
 */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|telegram|whatsapp|headless|lighthouse/i;

export async function POST(req: Request) {
  try {
    if (BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
    const body = (await req.json().catch(() => null)) as { p?: unknown; t?: unknown } | null;
    const id = typeof body?.p === "string" ? body.p : "";
    const kind = body?.t === "click" ? "clicks" : body?.t === "view" ? "views" : null;
    if (!kind || !/^[a-z0-9]{10,40}$/i.test(id)) return new Response(null, { status: 204 });
    const exists = await prisma.promoter.findFirst({ where: { id, consent: true, active: true }, select: { id: true } });
    if (!exists) return new Response(null, { status: 204 });
    const day = new Date(new Date().toISOString().slice(0, 10)); // UTC kun
    await prisma.promoterStat.upsert({
      where: { promoterId_day: { promoterId: id, day } },
      create: { promoterId: id, day, [kind]: 1 },
      update: { [kind]: { increment: 1 } },
    });
  } catch (e) {
    console.error(e);
  }
  return new Response(null, { status: 204 });
}
