import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { bookCardInclude, bookImage, priceRange } from "@/lib/books";
import { avatarColor } from "@/lib/promoters";
import { formatNumber } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

/** Rasmni PNG data-URI qiladi (satori WebP'ni har doim ham o'qimaydi); bo'lmasa null. */
async function asPng(src: Uint8Array | string | null, w: number, h: number): Promise<string | null> {
  if (!src) return null;
  try {
    let buf: Buffer;
    if (typeof src === "string") {
      const res = await fetch(src, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Buqancha/1.0 (+story)" } });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else buf = Buffer.from(src);
    const png = await sharp(buf).resize(w, h, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, "")}…` : t);

/**
 * Instagram story uchun rasm (1080×1920): kitob muqovasi, eng arzon narx, blogerning fikri va sahifa havolasi.
 * Faqat blogerning o'z tavsiyasi uchun. ?yuklab=1 — fayl sifatida yuklab olinadi.
 */
export async function GET(req: Request, { params }: { params: Promise<{ promoterId: string; bookId: string }> }) {
  const { promoterId, bookId } = await params;
  if (!/^[a-z0-9_-]{1,40}$/i.test(promoterId) || !/^[a-z0-9_-]{1,40}$/i.test(bookId)) return new Response("Topilmadi", { status: 404 });
  const rec = await prisma.promoterBook.findUnique({
    where: { promoterId_bookId: { promoterId, bookId } },
    include: { promoter: { include: { photo: true } }, book: { include: bookCardInclude } },
  });
  if (!rec) return new Response("Topilmadi", { status: 404 });
  const { promoter: p, book } = rec;
  const color = avatarColor(p.name);
  const [medium, bold, cover, avatar] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Manrope-500.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Manrope-800.ttf")),
    asPng(bookImage(book)?.url ?? null, 600, 900),
    asPng(p.photo?.data ?? null, 160, 160),
  ]);
  const range = priceRange(book);
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "110px 80px 90px",
          background: `linear-gradient(160deg, ${color} 0%, #0b1026 55%, #05070f 100%)`, color: "white", fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 6, opacity: 0.85 }}>TAVSIYA QILAMAN</div>
        <div style={{ display: "flex", marginTop: 60, width: 600, height: 900, borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,.55)", background: "#20263f" }}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} width={600} height={900} alt="" style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: 50, fontSize: 56, fontWeight: 800, textAlign: "center" }}>{book.title}</div>
          )}
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 64, fontWeight: 800, textAlign: "center", lineHeight: 1.1, maxWidth: 920 }}>{clip(book.title, 60)}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 38, opacity: 0.75 }}>{clip(book.author.name, 50)}</div>
        {range && (
          <div style={{ display: "flex", marginTop: 36, padding: "16px 40px", borderRadius: 999, background: "#ffd166", color: "#1a1300", fontSize: 44, fontWeight: 800 }}>
            {formatNumber(range.min)} so&apos;mdan
          </div>
        )}
        {rec.note && (
          <div style={{ display: "flex", marginTop: 44, fontSize: 36, lineHeight: 1.35, textAlign: "center", opacity: 0.92, maxWidth: 900 }}>
            “{clip(rec.note.replace(/\s+/g, " "), 170)}”
          </div>
        )}
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={96} height={96} alt="" style={{ borderRadius: 999, border: "4px solid rgba(255,255,255,.8)" }} />
          ) : (
            <div style={{ display: "flex", width: 96, height: 96, borderRadius: 999, background: color, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>{initials}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>@{p.instagram}</div>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.75 }}>Narxlarni solishtiring:</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 26, padding: "18px 36px", borderRadius: 24, background: "rgba(255,255,255,.12)", fontSize: 36, fontWeight: 800 }}>
          {host}/targibotchilar/{p.slug}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "Manrope", data: medium, weight: 500, style: "normal" },
        { name: "Manrope", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "public, max-age=600");
  if (new URL(req.url).searchParams.has("yuklab")) headers.set("Content-Disposition", `attachment; filename="buqancha-${book.slug.slice(0, 40)}.png"`);
  return new Response(img.body, { status: 200, headers });
}
