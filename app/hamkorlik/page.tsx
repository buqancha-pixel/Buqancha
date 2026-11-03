import type { Metadata } from "next";
import { PartnerForm } from "./PartnerForm";

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
      <PartnerForm />
    </div>
  );
}
