import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, SellerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JsonLd } from "@/components/JsonLd";
import { GoogleMapEmbed } from "@/components/GoogleMapEmbed";
import { SELLER_TYPE_LABEL, SELLER_TYPE_PARAM, plural } from "@/lib/format";
import { googleMapsUrl, yandexMapsUrl } from "@/lib/geo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kitob do'konlari manzillari — Toshkent va viloyatlar",
  description:
    "O'zbekistondagi kitob do'konlari va nashriyotlar manzillari: shahar bo'yicha ro'yxat, Google va Yandex xaritada yo'nalish.",
  alternates: { canonical: "/manzillar" },
};

const TYPES: Array<[string, string]> = [
  ["", "Hammasi"],
  ["dokon", "Do'konlar"],
  ["nashriyot", "Nashriyotlar"],
];

type SP = Promise<{ tur?: string; shahar?: string }>;

/** "instagram.com/topar.uz" yoki "@kitob" → havola */
function socialLink(social: string): { href: string; label: string } | null {
  const t = social.trim();
  const ig = t.match(/instagram\.com\/([\w.]+)/i);
  if (ig) return { href: `https://www.instagram.com/${ig[1]}/`, label: `Instagram: @${ig[1]}` };
  const tg = t.match(/(?:t\.me\/|^@)([\w]{4,})/i);
  if (tg) return { href: `https://t.me/${tg[1]}`, label: `Telegram: @${tg[1]}` };
  return null;
}

export default async function PlacesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const type: SellerType | undefined = sp.tur ? SELLER_TYPE_PARAM[sp.tur] : undefined;
  const where: Prisma.SellerWhereInput = {
    type: type ?? { in: ["STORE", "PUBLISHER"] },
    OR: [{ address: { not: null } }, { lat: { not: null } }],
  };
  const all = await prisma.seller.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, type: true, city: true, address: true, website: true, social: true, lat: true, lng: true },
  });
  const cities = Array.from(
    all.reduce((m, s) => m.set(s.city, (m.get(s.city) ?? 0) + 1), new Map<string, number>()),
  ).sort((a, b) => (a[0] === "Toshkent" ? -1 : b[0] === "Toshkent" ? 1 : b[1] - a[1] || a[0].localeCompare(b[0])));
  const city = sp.shahar && cities.some(([c]) => c === sp.shahar) ? sp.shahar : undefined;
  const sellers = city ? all.filter((s) => s.city === city) : all;

  const mapQuery = `${type === "PUBLISHER" ? "nashriyotlar" : "kitob do'konlari"} ${city ?? "Toshkent"}`;

  const href = (p: { tur?: string; shahar?: string }) => {
    const q = new URLSearchParams();
    const tur = p.tur ?? sp.tur;
    const shahar = "shahar" in p ? p.shahar : city;
    if (tur) q.set("tur", tur);
    if (shahar) q.set("shahar", shahar);
    const s = q.toString();
    return s ? `/manzillar?${s}` : "/manzillar";
  };

  const groups = cities
    .filter(([c]) => !city || c === city)
    .map(([c]) => [c, sellers.filter((s) => s.city === c)] as const)
    .filter(([, list]) => list.length);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Kitob do'konlari va nashriyotlar manzillari",
          itemListElement: sellers.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": s.type === "STORE" ? "BookStore" : "Organization",
              name: s.name,
              ...(s.website ? { url: s.website } : {}),
              address: { "@type": "PostalAddress", streetAddress: s.address ?? undefined, addressLocality: s.city, addressCountry: "UZ" },
              ...(s.lat != null && s.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } } : {}),
            },
          })),
          url: absoluteUrl("/manzillar"),
        }}
      />
      <h1 className="text-3xl sm:text-4xl">Kitob do&apos;konlari manzillari</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {TYPES.map(([key, label]) => (
          <Link
            key={key}
            href={href({ tur: key })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${(sp.tur ?? "") === key ? "bg-accent text-accent-contrast" : "border border-border bg-surface-2"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ shahar: undefined })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!city ? "bg-text text-bg" : "border border-border"}`}>
          Barcha shaharlar
        </Link>
        {cities.map(([c, n]) => (
          <Link key={c} href={href({ shahar: c })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${city === c ? "bg-text text-bg" : "border border-border"}`}>
            {c} <span className="tabular opacity-60">{n}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <GoogleMapEmbed query={mapQuery} zoom={city && city !== "Toshkent" ? 13 : 12} title={`Xarita: ${mapQuery}`} />
        <p className="mt-2 text-xs text-muted">
          Xaritada Google biladigan barcha {type === "PUBLISHER" ? "nashriyotlar" : "kitob do'konlari"} ko&apos;rsatiladi.
        </p>
      </div>
      <p className="mt-8 max-w-2xl text-muted">
        {plural(sellers.length, "joy")}
        {city ? ` — ${city}` : ""}. Manzil yonidagi tugma orqali Google yoki Yandex xaritada yo&apos;nalish oling. Manzil
        noto&apos;g&apos;ri yoki do&apos;koningiz ro&apos;yxatda yo&apos;qmi?{" "}
        <Link href="/hamkorlik" className="font-semibold text-accent hover:underline">
          Bizga yozing
        </Link>
        .
      </p>

      {groups.map(([c, list]) => (
        <section key={c} className="mt-10" aria-labelledby={`c-${c}`}>
          <h2 id={`c-${c}`} className="text-xl sm:text-2xl">
            {c} <span className="tabular text-muted">({list.length})</span>
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => {
              const social = s.social ? socialLink(s.social) : null;
              return (
                <li key={s.id} className="card flex flex-col p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{SELLER_TYPE_LABEL[s.type]}</p>
                  <h3 className="mt-1 text-base font-semibold">{s.name}</h3>
                  {s.address && <p className="mt-1 text-sm text-muted">{s.address}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                        {s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </a>
                    )}
                    {social && (
                      <a href={social.href} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                        {social.label}
                      </a>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2 pt-3">
                    <a href={googleMapsUrl(s)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-border bg-surface-2 px-3 py-2 text-center text-sm font-semibold hover:border-accent">
                      Google xarita
                    </a>
                    <a href={yandexMapsUrl(s)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-border bg-surface-2 px-3 py-2 text-center text-sm font-semibold hover:border-accent">
                      Yandex xarita
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
