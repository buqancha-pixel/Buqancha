import type { Metadata } from "next";
import { PARTNER_TELEGRAM } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hamkorlik — kitoblaringiz narxini Buqanchaga qo'shing",
  description:
    "Kitob do'koni, nashriyot yoki marketpleysmisiz? Narxlaringizni Buqanchaga qo'shing va kitob qidirayotgan xaridorlarga ko'rining.",
  alternates: { canonical: "/hamkorlik" },
};

export default function PartnerPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-3xl sm:text-4xl [text-wrap:balance]">Hamkor bo'ling</h1>
        <p className="mt-4 text-muted">
          Kitob do'koni, nashriyot yoki marketpleysmisiz? Narxlaringizni Buqanchaga qo'shing — kitobni qidirayotgan
          xaridorlar sizni darhol ko'radi.
        </p>
        <ul className="mt-6 flex flex-col gap-3 text-[15px]">
          {[
            "Bepul ro'yxatdan o'tish va narxlarni joylash",
            "Narxlarni fayl, API yoki saytingiz orqali yangilash",
            "Hamkor takliflari \"hamkor\" belgisi bilan ko'rsatiladi",
            "Xaridor to'g'ridan-to'g'ri saytingizga o'tadi",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="card flex flex-col gap-5 p-6 sm:p-8">
        <h2 className="text-xl">Telegram orqali yozing</h2>
        <p className="text-muted">Quyidagilarni yuborsangiz, tezroq ulaymiz:</p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px]">
          <li>Do&apos;kon yoki nashriyot nomi va shahringiz</li>
          <li>Saytingiz yoki Telegram kanalingiz</li>
          <li>Taxminan nechta kitob sotasiz</li>
          <li>Narxlarni qanday yubora olasiz: Excel/CSV fayl, sayt yoki API</li>
        </ol>
        <a
          href={`https://t.me/${PARTNER_TELEGRAM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-accent-contrast transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L7 13 2.5 11.6c-1-.3-1-1 .2-1.5L20.6 3.2c.8-.3 1.6.2 1.3 1.1Z" />
          </svg>
          @{PARTNER_TELEGRAM}
        </a>
        <p className="text-xs text-muted">Narxlar namunasi: CSV ustunlari — nom, muallif, ISBN, narx, mavjudligi, havola.</p>
      </div>
    </div>
  );
}
