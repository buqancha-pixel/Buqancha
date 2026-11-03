# Buqancha

O'zbekistondagi kitob do'konlari, nashriyotlar va marketpleyslarda bir kitobning narxini solishtiradigan sayt.

**Texnologiyalar:** Next.js 15 (App Router, TypeScript), PostgreSQL + Prisma, Tailwind CSS 4.

## Ishga tushirish

```bash
npm install
cp .env.example .env          # DATABASE_URL va NEXT_PUBLIC_SITE_URL ni sozlang
npx prisma migrate deploy     # jadvallarni yaratish
npm run db:seed               # namunaviy ma'lumotlar
npm run dev                   # http://localhost:3000
```

Testlar: `npm test` (qidiruv normallashtirish va narx formati).

## Muhit o'zgaruvchilari

| O'zgaruvchi | Tavsif |
| --- | --- |
| `DATABASE_URL` | PostgreSQL ulanishi |
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap va JSON-LD uchun domen (sukut: `https://buqancha.uz`) |
| `ALLOW_INDEXING` | `true` bo'lsa Google indekslaydi. Sukut bo'yicha o'chiq: robots.txt `Disallow: /`, sahifalarda `noindex` |

> **Muhim:** seed'dagi sotuvchilar real (Asaxiy, Uzum Market, Topar, Akademnashr, G'afur G'ulom nomidagi NMIU),
> lekin **narxlar namunaviy**. Shuning uchun takliflar `isSample` bilan belgilangan va saytda ogohlantirish chiqadi.
> Haqiqiy narxlar kiritilmaguncha `ALLOW_INDEXING` ni yoqmang.

## Tuzilma

- `prisma/schema.prisma` — `Author`, `Book`, `Edition`, `Seller`, `Offer`, `PartnerApplication`
- `prisma/seed.ts` — 14 kitob, 10 muallif, 5 sotuvchi, 54 taklif
- `lib/normalize.ts` — qidiruv normallashtirish (kirill → lotin, o'/o‘/ö, g'/ğ, sh/ş, ch/ç, x/h, q/k)
- `lib/books.ts` — so'rovlar, filtr va tartiblash
- `app/` — sahifalar:
  - `/` — qidiruv + ko'p qidirilgan kitoblar
  - `/qidiruv?q=` — natijalar (noindex)
  - `/kitob/[slug]` — narxlar; filtrlar URL orqali: `?tur=dokon|nashriyot|marketpleys`, `?mavjud=1`, `?tartib=arzon|qimmat|yangi`
  - `/muallif/[slug]`, `/sotuvchilar`, `/hamkorlik`
  - `sitemap.xml`, `robots.txt`

## SEO

- Barcha sahifalar server tomonida render qilinadi, narxlar HTML ichida.
- Kitob sahifasi title'i: `O'tkan kunlar narxi — 39 000 so'mdan | Buqancha`.
- JSON-LD: `Book` + `AggregateOffer` (lowPrice, highPrice, offerCount, priceCurrency `UZS`), `BreadcrumbList`, `Person`, `WebSite` + `SearchAction`.
- Canonical havolalar filtr parametrlarisiz.

## Mavzular

`Koinot` (to'q, yulduzli, suzuvchi muqovalar) va `Sodda` (oq, minimal). Tanlov `theme` cookie'sida saqlanadi va
serverda o'qiladi, shuning uchun sahifa ochilganda miltillamaydi. Animatsiyalar faqat `transform`/`opacity` bilan
ishlaydi va `prefers-reduced-motion` hurmat qilinadi.

## Keyingi bosqich

- Narxlarni avtomatik yig'ish (scraping/API), `source = AUTO`
- Admin panel: arizalar, sotuvchilar, takliflar
- ISBN ma'lumotlari va haqiqiy muqova rasmlari
