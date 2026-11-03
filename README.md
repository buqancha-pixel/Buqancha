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
| `CRON_SECRET` | `/api/cron/collect` uchun maxfiy kalit |
| `COLLECTOR_USER_AGENT` | Ixtiyoriy: bot User-Agent'i (sukut: `BuqanchaBot/1.0 (+SITE_URL/bot)`) |
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

## Sotuvchilar katalogi

`prisma/data/sellers.ts` — O'zbekistondagi 38 ta do'kon, nashriyot va marketpleys (ochiq manbalardan, har birida
`sources`). Sayt manzili faqat tasdiqlangan bo'lsa yozilgan; narxlar yo'q. Ko'rib chiqish uchun jadval:
`docs/sotuvchilar.csv`.

```bash
npm run db:sellers            # katalogni bazaga qo'shish/yangilash (takliflarga tegmaydi)
npm run db:sellers -- --csv   # docs/sotuvchilar.csv ni qayta yaratish
```

## Narx yig'ish (2-bosqich)

Har bir sotuvchida `collector` maydoni bor:

| `collector` | Qanday ishlaydi | Manba belgisi |
| --- | --- | --- |
| `NONE` | narxlar qo'lda kiritiladi | `MANUAL` |
| `FEED` | hamkorning CSV/JSON feed'i (`feedUrl` yoki fayl) — butun katalog | `PARTNER` |
| `PRODUCT_PAGE` | kuzatuvdagi mahsulot sahifalaridan schema.org JSON-LD (`Product` + `Offer`) | `AUTO` |

Buyruqlar:

```bash
npm run import-feed -- topar docs/feed-namuna.csv   # hamkor feed'ini import qilish
npm run track-url -- asaxiy https://asaxiy.uz/...   # mahsulot sahifasini kuzatuvga qo'shish
npm run collect                                      # barcha yoqilgan sotuvchilar (yoki: npm run collect -- asaxiy)
npm run review                                       # moslanmaganlar va shubhali narxlar navbati
```

Rejalashtirilgan ishga tushirish: `GET /api/cron/collect` + `Authorization: Bearer $CRON_SECRET`.

Qoidalar:

- **Moslashtirish:** avval ISBN, keyin normallashtirilgan nom + muallif; kitobning bir nechta nashri bo'lsa — nashriyot
  bo'yicha. Aniq bo'lmasa, mahsulot `UnmatchedItem` navbatiga tushadi (`npm run review -- link <id> <kitob-slug>`).
- **Xavfsizlik:** 1 000 – 10 000 000 so'mdan tashqari narx rad etiladi; 70% dan ortiq keskin o'zgarish qo'llanmaydi,
  `pendingPrice` ga yoziladi (`npm run review -- accept|reject <offerId>`).
- **Feed (butun katalog):** feed'da yo'q takliflar "mavjud emas" bo'ladi, lekin yarmidan ko'pi yo'qolsa — feed buzuq
  deb hisoblanib, hech narsa belgilanmaydi. Sotuvchining namunaviy narxlari birinchi haqiqiy feed'da o'chiriladi.
- **Narx tarixi:** narx yoki mavjudlik o'zgarganda `PriceSnapshot` yoziladi; kitob sahifasida "oldin … ↑/↓%" ko'rinadi.
- **Bot odobi** (`BuqanchaBot`, `/bot` sahifasi): robots.txt va `Crawl-delay` hurmat qilinadi, robots.txt ochilmasa
  sayt umuman yuklanmaydi; hostga so'rovlar orasida `Seller.crawlDelayMs` (sukut 3 s) kutiladi; 429/5xx da
  `Retry-After` bilan qayta uriniladi. Bot saytni aylanib chiqmaydi — faqat kuzatuvdagi sahifalarni tekshiradi.

Testlar: `npm test` (unit) va `npm run test:db` (alohida `buqancha_test` bazasida integratsiya; bazani seed qiladi).

## Keyingi qadamlar

- Real sotuvchilar uchun adapterlar (sayt HTML'ini ko'rib, kerak bo'lsa JSON-LD'dan tashqari parser) —
  muhit tarmog'ida sotuvchi domenlari ochilgandan keyin
- Admin panel: arizalar, ko'rib chiqish navbati, sotuvchi sozlamalari
- ISBN ma'lumotlari va haqiqiy muqova rasmlari
