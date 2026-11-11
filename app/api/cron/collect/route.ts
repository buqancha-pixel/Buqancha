import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector/run";

// Rejalashtirilgan yig'ish (masalan, Vercel Cron yoki tashqi cron):
//   GET /api/cron/collect  —  Authorization: Bearer <CRON_SECRET>
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "ruxsat yo'q" }, { status: 401 });
  }
  const results = await collectAll();
  return NextResponse.json({
    results: results.map((r) => ({ ...r, stats: { ...r.stats, errors: r.stats.errors.slice(0, 20) } })),
  });
}
