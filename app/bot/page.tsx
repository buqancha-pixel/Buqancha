import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BuqanchaBot — narx yig'uvchi bot",
  description: "BuqanchaBot nima qiladi, qanday qoidalarga amal qiladi va uni qanday cheklash mumkin.",
  alternates: { canonical: "/bot" },
};

export default function BotPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <h1 className="text-3xl sm:text-4xl">BuqanchaBot</h1>
      <p className="mt-4 text-muted">
        BuqanchaBot — Buqancha saytining narx yig'uvchi boti. U kitob sahifalaridagi ochiq narx va mavjudlik ma'lumotini
        (schema.org Product/Offer) o'qiydi, xaridorlar narxlarni solishtira olishi uchun.
      </p>
      <h2 className="mt-8 text-xl">Qoidalar</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px]">
        <li>
          Har doim <code>robots.txt</code> ga amal qiladi, jumladan <code>Crawl-delay</code>. robots.txt vaqtincha
          ochilmasa, saytga umuman murojaat qilmaydi.
        </li>
        <li>Bir saytga so'rovlar orasida kamida bir necha soniya kutadi; 429 javobida <code>Retry-After</code> ni hurmat qiladi.</li>
        <li>Faqat allaqachon kuzatuvga olingan mahsulot sahifalarini qayta tekshiradi — saytni to'liq aylanib chiqmaydi.</li>
        <li>Shaxsiy ma'lumot, savat yoki akkaunt sahifalariga kirmaydi.</li>
      </ul>
      <h2 className="mt-8 text-xl">Botni cheklash</h2>
      <p className="mt-3 text-[15px]">robots.txt fayliga qo'shing:</p>
      <pre className="card mt-3 overflow-x-auto p-4 text-sm">{`User-agent: BuqanchaBot\nDisallow: /`}</pre>
      <p className="mt-6 text-[15px]">
        Narxlarni o'zingiz yubormoqchimisiz (feed yoki API)?{" "}
        <Link href="/hamkorlik" className="font-semibold text-accent hover:underline">
          Hamkor bo'ling
        </Link>
        .
      </p>
    </div>
  );
}
