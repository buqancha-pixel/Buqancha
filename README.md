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
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap va JSON-LD uchun domen (sukut: Vercel'dagi manzil, bo'lmasa `https://buqancha.uz`) |
| `DATABASE_URL_UNPOOLED` | Ixtiyoriy: migratsiyalar uchun to'g'ridan-to'g'ri ulanish (Neon integratsiyasi o'zi qo'yadi) |
| `CRON_SECRET` | `/api/cron/collect` uchun maxfiy kalit |
| `COLLECTOR_USER_AGENT` | Ixtiyoriy: bot User-Agent'i (sukut: `BuqanchaBot/1.0 (+SITE_URL/bot)`) |
| `ADMIN_PASSWORD` | Admin panel (`/admin`) paroli, kamida 8 belgi. O'rnatilmasa panel o'chiq |
| `PARTNER_SECRET` | Ixtiyoriy: hamkor sessiyalarini imzolash kaliti (bo'lmasa `ADMIN_PASSWORD`; o'zgarsa hamkorlar qayta kiradi) |
| `GOOGLE_SITE_VERIFICATION` | Ixtiyoriy: Google Search Console "HTML tag" tasdiqlash kodi (`content` qiymati) |
| `ALLOW_INDEXING` | Google indeksatsiyasi. Sukut: Vercel production'da yoqiq, boshqa joyda o'chiq (robots.txt `Disallow: /`, `noindex`). `true`/`false` bilan majburlash mumkin |

> **Muhim:** `npm run db:seed` dagi narxlar **namunaviy** (`isSample`, saytda ogohlantirish chiqadi) — faqat mahalliy
> ishlab chiqish uchun. Internetdagi sayt haqiqiy narxlar nusxasidan (`prisma/data/catalog.json.gz`) boshlanadi.

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

`prisma/data/sellers.ts` — O'zbekistondagi 96 ta do'kon, nashriyot va marketpleys (qidiruv, OAV va
goldenpages.uz / yellowpages.uz / kitobxon.com kataloglaridan; har birida `sources`). Sayt manzili faqat ochilib
tekshirilgan bo'lsa yozilgan. Ko'rib chiqish uchun jadval: `docs/sotuvchilar.csv`.

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
| `PRODUCT_PAGE` | mahsulot sahifalaridan schema.org JSON-LD (`Product` + `Offer`); `sitemapUrls` bo'lsa — yangi sahifalar sitemap'dan topiladi | `AUTO` |

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
  bo'yicha. Do'kon qo'shimchalari ("(А5, qattiq) 400 bet") olib tashlanadi; nomda boshqa so'z qolsa ("Ufq
  bo'sag'asida"), to'plam/jild yoki boshqa til bo'lsa — moslanmaydi va `UnmatchedItem` navbatiga tushadi
  (`npm run review -- link <id> <kitob-slug>`). Kitob ma'lum, ISBN esa yangi bo'lsa — yangi nashr yaratiladi.
- **Diniy adabiyot avtomatik qo'shilmaydi** — sayt egasi qo'lda kiritadi. Do'kon kategoriyasi (Qamar:
  "Diniy-ma'rifiy adabiyot", "Qur'on"; Barakot: "Bo'lim") va nom/nashriyotdagi aniq belgilar bo'yicha
  aniqlanadi; bunday havolalar "e'tiborsiz" deb belgilanadi. Qo'lda kiritilgan (`origin = "manual"`) kitobga
  mos kelsa — narxi yig'iladi. Avval import qilinganlarini olib tashlash: `npm run remove-religious -- --apply`.
- **Katalog importi** (`npm run import-catalog -- <sotuvchi>`): sitemap'dagi barcha kitob sahifalari;
  ISBN va muallif bo'lsa yangi kitob yaratiladi (`origin = "import"`), do'kon tavsiflari ko'chirilmaydi.
  Keyin: `npm run merge-duplicates -- --apply` (takrorlarni birlashtirish, jildlarni ajratish).
- **Muqova rasmlari:** sotuvchi saytidan ko'rsatiladi (ko'chirilmaydi), "Rasm: <sotuvchi>" bilan;
  o'z suratlari: `npm run images -- own <papka>` (fayl nomi = ISBN); so'rov bo'lsa: `npm run images -- block <sotuvchi>`.
- **Sitemap orqali topish:** faqat manzilida bazadagi kitob nomi uchraydigan va avval ko'rilmagan sahifalar yuklanadi.
- **Namunaviy narxlar:** kitobda haqiqiy narx bo'lsa, eng arzon/qimmat, sarlavha va JSON-LD faqat haqiqiylardan
  hisoblanadi; namunaviylar alohida yig'ilgan bo'limda.
- **Xavfsizlik:** 1 000 – 10 000 000 so'mdan tashqari narx rad etiladi; 70% dan ortiq keskin o'zgarish qo'llanmaydi,
  `pendingPrice` ga yoziladi (`npm run review -- accept|reject <offerId>`).
- **Feed (butun katalog):** feed'da yo'q takliflar "mavjud emas" bo'ladi, lekin yarmidan ko'pi yo'qolsa — feed buzuq
  deb hisoblanib, hech narsa belgilanmaydi. Sotuvchining namunaviy narxlari birinchi haqiqiy feed'da o'chiriladi.
- **Narx tarixi:** narx yoki mavjudlik o'zgarganda `PriceSnapshot` yoziladi; kitob sahifasida "oldin … ↑/↓%" ko'rinadi.
- **Bot odobi** (`BuqanchaBot`, `/bot` sahifasi): robots.txt va `Crawl-delay` hurmat qilinadi, robots.txt ochilmasa
  sayt umuman yuklanmaydi; hostga so'rovlar orasida `Seller.crawlDelayMs` (sukut 3 s) kutiladi; 429/5xx da
  `Retry-After` bilan qayta uriniladi. Bot saytni aylanib chiqmaydi — faqat kuzatuvdagi sahifalarni tekshiradi.

Hozir avtomatik yig'iladigan sotuvchilar: **Qamar**, **Barakot** (sitemap + JSON-LD), **Akademnashr**. Asaxiy va
Topar Cloudflare bot himoyasidan foydalanadi — chetlab o'tilmaydi, ular bilan feed orqali ishlash kerak.

> Proksi orqali chiqadigan muhitda (masalan, bulutli dev-konteyner) Node `fetch` uchun `NODE_USE_ENV_PROXY=1` kerak.
> `npm run db:seed` bazani to'liq qayta yaratadi — yig'ilgan narxlar ham o'chadi; keyin `npm run collect` ni qayta ishga tushiring.

Testlar: `npm test` (unit) va `npm run test:db` (alohida `buqancha_test` bazasida integratsiya; bazani seed qiladi).

## Admin panel (`/admin`)

Vercel'da `ADMIN_PASSWORD` o'rnatilgach, `/admin` da parol bilan kiriladi (sessiya 30 kun, parol o'zgarsa bekor bo'ladi).

- **Kitoblar:** qidirish, yangi kitob (lotin yoki kirill nomi — kirill avtomatik lotinga o'giriladi), tahrirlash, o'chirish;
  nashrlar (ISBN, nashriyot, yil, muqova, rasm havolasi va manbasi); muallif ma'lumotlari.
- **Narxlar:** sotuvchini tanlab narx, havola, mavjudligi. Havolasi bor narxlar kechki yig'ishda o'zi yangilanadi.
- **Ko'rib chiqish:** 70% dan ko'p o'zgargan narxlarni qabul/rad qilish; moslanmagan va e'tiborsiz mahsulotlarni
  mavjud kitob/nashrga bog'lash yoki ulardan yangi kitob yaratish (diniy adabiyot shu yerdan qo'lda qo'shiladi).
- **Sotuvchilar:** qo'shish, tahrirlash, muqova rasmlarini ko'rsatishni o'chirish.
- **Boshqa kitobga qo'shish:** kitob aslida boshqa kitobning nashri bo'lsa (tarjima, takror) — nashrlari va narxlari
  o'sha kitobga o'tadi. Nashrning tili (`Edition.language`: bo'sh — o'zbekcha, `en`, `ru`, `uz-Cyrl`...) belgi bilan
  ko'rsatiladi; eng arzon/eng qimmat narx faqat o'zbekcha nashrlardan hisoblanadi.
- **Bosh sahifa banneri:** kitob sahifasida «Bannerda ko'rsatish» + qisqa yozuv. Bannerda 6 tagacha kitob:
  avval tanlanganlar (oxirgisi birinchi), qolgani — saytga eng so'nggi qo'shilgan, rasmi va narxi bor kitoblar.

Qo'lda qo'shilgan yoki tahrirlangan kitoblar `origin = "manual"` — avtomatik tozalash va diniy filtr ularga tegmaydi.
O'chirilgan narx havolasi `IGNORED` sifatida eslab qolinadi, shuning uchun katalog importi kitobni qayta yaratmaydi.

**Manzillar** (`/manzillar`): tepada Google xaritasi (kalitsiz joylash, "kitob do'konlari <shahar>" qidiruvi —
Google biladigan barcha do'konlar), pastda Buqancha ro'yxati shahar bo'yicha, Google/Yandex xarita tugmalari bilan.
Admin panelda kiritilgan joylashuv (Google Maps koordinatasi/havolasi) tugmalarni aniq nuqtaga olib boradi va
JSON-LD `geo` ga yoziladi; avtomatik geokodlash ishlatilmaydi — O'zbekiston manzillarida boshqa shahardagi ko'chani topadi.

**Katalog** (chap burchakdagi ☰ menyu): faqat tillar bo'yicha — `/katalog` (barchasi), `/katalog/ozbek-tilida`,
`rus-tilida`, `ingliz-tilida`. Kitob tili nashrlaridan: bitta o'zbekcha nashri bo'lsa — o'zbekcha, aks holda barcha
nashrlari shu tilda. Mavzular bo'yicha bo'linish olib tashlangan: eski `/katalog/<mavzu>` va `/katalog/<til>/<mavzu>`
havolalari 308 bilan katalog/til sahifasiga yo'naltiriladi. Yig'uvchi sotuvchi bo'limlarini `Book.categories` ga
yozishda davom etadi (saytda ko'rinmaydi), "rus-tilida" kabi bo'limlar nashr tiliga yoziladi.

**Ruscha kitoblar:** `Seller.importLanguages` (sukut `["uz"]`; Bookhunter `["uz","ru"]`) — ruscha mahsulotdan yangi kitob
yaratiladi, nomi asl kirill holida, nashri `language = "ru"`. Til nomidan aniqlanadi (`looksRussian`: ruscha harflar,
so'zlar, qo'shimchalar; o'zbekcha belgilar bo'lsa — o'zbekcha). Eski importdagi ruscha kitoblar: `npm run fix-russian`.

**Bo'lim sahifalaridan yig'ish:** sitemap'da mahsulot bo'lmagan saytlar uchun `Seller.listingUrls` — bo'lim
sahifalari `?page=N` bilan yangi havola chiqmaguncha aylanadi (masalan, kitobolami.uz). Nom "MUALLIF: NOM"
ko'rinishida bo'lsa, ikki nuqtagacha qism bazadagi muallif bilan solishtiriladi.

Instagram (`INSTAGRAM`, `lib/site.ts`): sarlavhada belgi, sayt pastida tugma, bosh sahifada schema.org
`Organization.sameAs` (Google sahifani sayt bilan bog'laydi).

**Kitob targ'ibotchilari** (`/targibotchilar`): Instagram kitob blogerlari va ular tavsiya qilgan kitoblar (narxlari
bilan); kitob sahifasida "Tavsiya qiladi: @…". Admin panel → Targ'ibotchilar: qo'shish, kitob biriktirish (izoh bilan).
"Rozilik olindi" belgilanmaguncha bloger saytda ko'rinmaydi.

**Hamkorlar kabineti** (`/hamkor`): do'kon/nashriyot o'z narxlarini o'zi boshqaradi — kitob qo'shish (ISBN yoki nom
bo'yicha qidirib), narx/mavjudlikni tahrirlash, bazada yo'q kitobni qo'shish (ISBN bilan; diniy adabiyot — faqat
sayt egasi orqali), butun ro'yxatni bitta fayl bilan yuklash, do'kon ma'lumotlari va xaritadagi joylashuv.
Hamkor faqat o'z sotuvchisining narxlarini ko'radi va o'zgartiradi (sessiya bitta `sellerId` ga bog'langan).

Fayl yuklash: Excel (`.xlsx`), Word (`.docx` — hujjatdagi eng katta jadval), CSV yoki JSON, 4 MB gacha. Ustun
nomlari o'zbekcha/ruscha/inglizcha bo'lishi mumkin ("Kitob nomi", "Narx (so'm)", "ISBN", "Muallif", "Nashriyot",
"Mavjud"; `lib/collector/parsers/feed.ts` → `ALIASES`). ISBN bo'yicha moslanadi; bazada yo'q kitob ISBN va muallif
bo'lsa yaratiladi, diniy adabiyot o'tkazib yuboriladi. "To'liq ro'yxat" belgilansa faylda yo'qlari "sotuvda yo'q".
Namuna: `public/buqancha-namuna.xlsx` (`npx tsx scripts/make-template.ts` bilan qayta yaratiladi). Yuklash tarixi
admin panelda (Sotuvchilar → sotuvchi → Hamkor kabineti → Fayl yuklashlari). Kirish — admin panelda (Sotuvchilar → sotuvchi → Hamkor kabineti) yaratiladigan
maxfiy havola; bazada faqat kalit xeshi, login/parol/telefon saqlanmaydi; yangi havola eskisini va sessiyalarni
bekor qiladi. `Seller.partnerUntil` — birinchi marta 30 kun bepul, keyin admin "+30 kun"/"+1 yil" bilan uzaytiradi;
muddat tugasa narxlar qoladi, tahrirlash va "Hamkor" belgisi yopiladi. Hamkor narxini kechki avtomatik yig'ish
almashtirmaydi. Sessiya imzosi: `PARTNER_SECRET` (bo'lmasa `ADMIN_PASSWORD`).

**Sotuvchilar boshqaruvi** (admin → Sotuvchilar): "+ Yangi sotuvchi qo'shish"; turlar — do'kon, onlayn do'kon
(`ONLINE`, faqat internetda sotadiganlar; saytda "Onlayn do'konlar" bo'limi va kitob sahifasida filtr), nashriyot,
marketpleys. Ro'yxatda tur va "Faqat narxi yo'qlar" filtri, belgilab birdaniga o'chirish; sotuvchi sahifasida ham
"Sotuvchini o'chirish". O'chirish narxlar, narx tarixi va yig'ish jurnalini (cascade) hamda shu sotuvchidan olingan
muqova rasmlarini olib tashlaydi, kitoblar qoladi. Slug `RemovedSeller` ga yoziladi: `npm run db:sellers` uni fayldan
qayta yaratmaydi, kechki `collect`/`import-catalog` esa o'tkazib yuboradi. Admin shu nom bilan qayta yaratsa — yozuv o'chadi.

**Do'konga tez kabinet ochish** (admin → Sotuvchilar → "Do'konga kabinet ochish"): faqat nom, tur (sukut — onlayn
do'kon) va muddat — 30 kun, 6 oy, 1 yil yoki muddatsiz (`PARTNER_FOREVER`, 2999-yil). Sotuvchi yaratiladi, sahifaning
tepasida kirish havolasi va do'konga yuboriladigan tayyor yo'riqnoma chiqadi. Do'kon kabinetda nomi va aloqalarini
o'zi kiritadi: telefon, Telegram, Instagram, sayt (`Seller.phone/telegram/instagram`, `lib/contacts.ts`; kamida
bittasi majburiy). Narxida havola bo'lmasa, kitob sahifasida "Buyurtma berish" tugmasi shu aloqalarni ochadi.
Logotip yoki do'kon rasmi: kabinetda yoki admin sotuvchi sahifasida "Rasm yuklash" — `sharp` bilan kesmasdan 400×400
shaffof fonli WebP (`SellerPhoto`, `/rasm/sotuvchi/<id>?v=`); kitob sahifasidagi narx yonida, sotuvchilar sahifasi va
bosh sahifada chiqadi. Rasm qayta ishlash umumiy: `lib/photo.ts` (`toWebp`, bloger rasmi — kesib, logotip — sig'dirib).

**Bloger kabineti** (`/bloger`): admin → Targ'ibotchilar → bloger → "Kabinet ochish" maxfiy havola beradi
(`Promoter.tokenHash`, hamkor kabinetidagi kabi faqat xesh; yangi havola eskisini bekor qiladi, "Kabinetni yopish" o'chiradi).
Bloger faqat o'zining tavsiyalarini (kitob qidirib qo'shish, izoh, olib tashlash) va ism/rasm/tavsif/obunachilarni
o'zgartiradi — `promoterId` sessiyadan olinadi, formadan emas.
Profil rasmi: kabinetda (yoki admin sahifasida) "Rasm yuklash" — brauzer telefon rasmini 1200 px gacha kichraytiradi,
server `sharp` bilan 400×400 WebP qilib `PromoterPhoto` jadvaliga yozadi; `/rasm/bloger/<id>?v=<vaqt>` dan uzoq
keshlanib beriladi. Tavsiya matni 500 so'zgacha (`cleanNote`); to'liq matn kitob sahifasidagi "Kitob targ'ibotchilari
tavsiyasi" bo'limida, bloger sahifasida qisqasi va "To'liq o'qish" havolasi.
Bloger sahifasi qo'shimchalari: banner (`PromoterBanner`, 1500×500; yuklanmasa — tavsiyalar muqovalaridan kollaj),
1–5 yulduz baho va "📌 Eng sevimli" (`PromoterBook.rating/pinned`, 3 tagacha, sahifa boshida), "Hozir o'qiyapman"
(`Promoter.readingBookId`), to'plamlar (`PromoterList`, `/targibotchilar/<bloger>/<to'plam>`, faqat o'z tavsiyalaridan,
50 tagacha), Instagram story rasmi (`/rasm/story/<blogerId>/<kitobId>`, 1080×1920 PNG, `next/og` + Manrope shrifti
`assets/fonts`, muqova `sharp` bilan PNG'ga; `?yuklab=1` — fayl) va statistika (`PromoterStat`: kunlik umumiy
ko'rishlar va kitobga o'tishlar, `/api/stat`, botlar sanalmaydi, shaxsiy ma'lumot saqlanmaydi; kabinet va adminda).
**Bloger postlari** (`PromoterPost`): maqola (50–3000 so'z, rasmlar bilan), rasmli post (1–6 rasm) va video.
Maqola va rasm darhol chiqadi; video `PENDING` — admin → Postlar (menyuda kutayotganlar soni) shablon bo'yicha tekshirib
tasdiqlaydi yoki sababini tanlab rad etadi (bloger sababini kabinetida ko'radi). Video saytga yuklanmaydi: YouTube
(oddiy/Shorts), Instagram Reels yoki TikTok havolasi (`lib/video.ts`) o'sha platformaning iframe pleyeri bilan
ko'rsatiladi. Video shabloni — `VIDEO_RULES` (bloger joylashda hammasini belgilaydi) va videoning oxiriga qo'yiladigan
yakuniy kadr `/rasm/shablon/<blogerId>?f=v|h` (1080×1920 / 1920×1080). Post rasmlari 1600px WebP (`PromoterPostImage`,
`/rasm/post/<id>`), brauzer oldindan kichraytiradi. Saytda: bloger sahifasida "Videolar va maqolalar",
`/targibotchilar/<bloger>/p/<id>`, kitob sahifasida "Blogerlar videolari va maqolalari".
Tarmoqlar: Instagram (admin), Telegram va YouTube kanali (bloger kabinetda o'zi kiritadi, `normalizeTelegram`/
`normalizeYoutube` — video havolasi emas, kanal) — bloger sahifasi va ro'yxatda logolar bilan (`SocialLinks`). Instagram manzili, rozilik va saytda ko'rinish faqat adminda.

**Kitobni o'chirish** faqat admin panelda: Admin → Kitoblar sukut bo'yicha muqovali ko'rinishda (katalogdagidek,
"Mashhur / Yangi qo'shilgan / Eski" tartibi) — muqovadagi 🗑 bilan bittasini yoki katakchalarni belgilab, pastdagi
"Belgilanganlarni o'chirish" bilan birdaniga (120 tagacha); "☰ Ro'yxat" ko'rinishi ham bor. Kitob sahifasining
pastida ham "Kitobni o'chirish". Saytning ochiq sahifalarida (katalog, kitob sahifasi) admin tugmalari yo'q. O'chirilgan
kitobning sotuvchi havolalari eslab qolinadi — kechki yig'ish uni qayta qo'shmaydi.

Hamkorlik sahifasida forma yo'q (shaxsiy ma'lumot saqlanmaydi) — Telegram havolasi (`PARTNER_TELEGRAM`, `lib/site.ts`).

## Internetga chiqarish (Vercel + Neon)

1. **Vercel:** vercel.com → GitHub bilan kirish → *Add New → Project* → `Buqancha` reposini tanlash → *Deploy*.
   Birinchi build xato bilan tugaydi (baza hali yo'q) — bu kutilgan holat.
2. **Neon bazasi:** loyiha → *Storage* → *Create Database* → **Neon** → hudud: Frankfurt (`eu-central-1`) →
   loyihaga ulash. Integratsiya `DATABASE_URL` va `DATABASE_URL_UNPOOLED` ni o'zi qo'yadi.
3. *Deployments* → oxirgisi → *Redeploy*. `vercel-build` ([scripts/vercel-build.sh](scripts/vercel-build.sh))
   migratsiyalarni qo'llaydi, baza bo'sh bo'lsa katalog nusxasini yuklaydi, so'ng saytni yig'adi.
4. **Narxlarni har kuni yangilash** ([.github/workflows/narxlar.yml](.github/workflows/narxlar.yml)) — GitHub repo →
   *Settings → Secrets and variables → Actions*: secret `DATABASE_URL` (= Neon'dagi `DATABASE_URL_UNPOOLED`),
   variable `SITE_URL` (sayt manzili). Qo'lda ishga tushirish: *Actions → Narxlarni yangilash → Run workflow*.
5. **Google:** production sayt indeksatsiyaga ochiq. Google Search Console'ga saytni qo'shib (HTML tag usuli,
   `GOOGLE_SITE_VERIFICATION`), `sitemap.xml` ni yuboring. O'z domeni (masalan `buqancha.uz`) ulangach
   `NEXT_PUBLIC_SITE_URL` ni ham o'rnating.

**Texnik xizmat** ([.github/workflows/xizmat.yml](.github/workflows/xizmat.yml)) — *Actions → Texnik xizmat → Run workflow*:
statistika, ko'rib chiqish ro'yxati, takrorlarni ko'rish/birlashtirish, diniy kitoblarni ko'rish/olib tashlash,
bitta sotuvchi narxlarini yangilash, katalog importi, moslanmaganlarni qayta urinish, rasmlar statistikasi,
sotuvchilarni sinxronlash, kitobni boshqa kitobga qo'shish (`parametr`: `<kitob-slug> <asosiy-slug> [til]`).
`...-qollash` vazifalari bazani o'zgartiradi, qolganlari faqat ko'rsatadi; natija workflow logida.
Kechki narx yig'ish bilan bir vaqtda ishlamaydi (navbatda kutadi). Mahalliy: `npm run stats`.

Katalog nusxasini yangilash (mahalliy bazadan): `npm run snapshot -- export`. Nusxa faqat **bo'sh** bazaga yuklanadi —
ishlayotgan bazadagi ma'lumot ustidan yozilmaydi.

> Sayt foydalanuvchilarning shaxsiy ma'lumotini saqlamaydi (hamkorlik formasi Telegram havolasiga almashtirilgan).
> O'zbekiston qonunchiligiga ko'ra fuqarolarning shaxsiy ma'lumotlari mamlakat ichida saqlanishi kerak — kelajakda
> ro'yxatdan o'tish yoki forma qo'shilsa, buni hisobga oling.

## Keyingi qadamlar

- Real sotuvchilar uchun adapterlar (sayt HTML'ini ko'rib, kerak bo'lsa JSON-LD'dan tashqari parser) —
  muhit tarmog'ida sotuvchi domenlari ochilgandan keyin
- Admin panel: muqova rasmini telefondan yuklash (Vercel Blob)
- ISBN ma'lumotlari va haqiqiy muqova rasmlari
