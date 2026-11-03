/**
 * O'zbekistondagi kitob sotuvchilari va nashriyotlar katalogi.
 *
 * Ochiq manbalardan (qidiruv natijalari, katalog saytlari, OAV) 2026-yil
 * noyabrda yig'ilgan. Har bir yozuvda `sources` — tekshirish uchun manbalar.
 *
 * Qoidalar:
 *  - `website` faqat qidiruvda shu saytning o'zi chiqqan bo'lsa yoziladi.
 *    Manbalar bir-biriga zid yoki tasdiqlanmagan bo'lsa — null.
 *  - Manzillar katalog saytlaridan olingan va eskirgan bo'lishi mumkin.
 *  - Ma'lumot topilmagan nashriyotlar (masalan, "Nihol", "Mumtoz so'z") qo'shilmagan.
 *  - Bu yerda hech qanday narx yo'q: narxlar faqat feed yoki sahifadan yig'iladi.
 */
import type { SellerType } from "@prisma/client";

export type SellerSeed = {
  slug: string;
  name: string;
  type: SellerType;
  city: string;
  website: string | null;
  searchUrlTemplate?: string | null;
  social?: string | null;
  address?: string | null;
  description: string;
  sources: string[];
};

export const SELLERS: SellerSeed[] = [
  // ---------------- Marketpleyslar ----------------
  {
    slug: "asaxiy",
    name: "Asaxiy",
    type: "MARKETPLACE",
    city: "Toshkent",
    website: "https://asaxiy.uz",
    searchUrlTemplate: "https://asaxiy.uz/uz/product?key={q}",
    description:
      "Onlayn marketpleys, kitoblar bo'limi bor; O'zbekiston bo'ylab yetkazib berish. Toshkentda bir nechta oflayn kitob do'koni. Asaxiy Books nashriyoti kitoblari ham shu yerda sotiladi.",
    sources: [
      "https://asaxiy.uz/product/knigi",
      "https://www.afisha.uz/uz/gorod/2024/09/27/kitoblar",
      "https://uz.wikipedia.org/wiki/Asaxiy_Books",
    ],
  },
  {
    slug: "uzum-market",
    name: "Uzum Market",
    type: "MARKETPLACE",
    city: "Toshkent",
    website: "https://uzum.uz",
    searchUrlTemplate: "https://uzum.uz/uz/search?query={q}",
    description:
      "Yirik marketpleys: kitoblarni turli do'konlar va nashriyotlar sotadi (masalan, BOOK.UZ, Yangi asr avlodi).",
    sources: ["https://uzum.uz/uz/shop/bookuz", "https://uzum.uz/uz/shop/yangiasravlodinashriyoti"],
  },
  {
    slug: "olcha",
    name: "Olcha",
    type: "MARKETPLACE",
    city: "Toshkent",
    website: "https://olcha.uz",
    description: "Onlayn do'kon, kitoblar bo'limi; O'zbekiston bo'ylab yetkazib berish.",
    sources: ["https://olcha.uz/oz/category/knigi"],
  },

  // ---------------- Do'konlar ----------------
  {
    slug: "topar",
    name: "Topar",
    type: "STORE",
    city: "Toshkent",
    website: "https://topar.uz",
    social: "instagram.com/topar.uz",
    description: "2018-yilda onlayn boshlangan, keyin oflayn do'konlar ochgan kitob do'koni; sayt orqali buyurtma.",
    sources: [
      "https://www.goldenpages.uz/uz/company/?Id=104540",
      "https://www.spot.uz/ru/2025/07/17/topar/",
      "https://www.afisha.uz/uz/gorod/2025/05/06/books",
    ],
  },
  {
    slug: "bookhunter",
    name: "Bookhunter",
    type: "STORE",
    city: "Toshkent",
    website: "https://bookhunter.uz",
    address: "Amir Temur ko'chasi, 129A",
    description: "Biznes va ilmiy-ommabop adabiyotga ixtisoslashgan onlayn do'kon; O'zbekiston bo'ylab yetkazib berish.",
    sources: ["https://bookhunter.uz/ru/contacts", "https://www.goldenpages.uz/company/?Id=102091"],
  },
  {
    slug: "kitobxona",
    name: "Kitobxona",
    type: "STORE",
    city: "Toshkent",
    website: "https://bookshop.uz",
    description: "Onlayn kitob do'koni; Toshkent bo'ylab tezkor yetkazib berish.",
    sources: ["https://bookshop.uz/"],
  },
  {
    slug: "qamar",
    name: "Qamar",
    type: "STORE",
    city: "Toshkent",
    website: "https://qamar.uz",
    description: "Oflayn va onlayn kitob do'koni; Toshkentga kuryer, viloyatlarga pochta orqali.",
    sources: ["https://qamar.uz/", "https://www.afisha.uz/uz/gorod/2025/05/06/books"],
  },
  {
    slug: "kitobxon",
    name: "Kitobxon",
    type: "STORE",
    city: "Toshkent",
    website: "https://kitobxon.com",
    address: "Mirzo Ulug'bek tumani",
    description: "Qog'oz, elektron va audio kitoblar; nashriyotlar katalogi ham yuritiladi.",
    sources: ["https://kitobxon.com/oz/company/kitobxon.com"],
  },
  {
    slug: "shams-kitoblari",
    name: "Shams kitoblari",
    type: "STORE",
    city: "Onlayn",
    website: "https://shamskitoblari.uz",
    description: "Onlayn kitob do'koni (jumladan Hilol Nashr kitoblari).",
    sources: ["https://shamskitoblari.uz/index.php?route=product/manufacturer/info&manufacturer_id=8"],
  },
  {
    slug: "book-uz",
    name: "BOOK.UZ",
    type: "STORE",
    city: "Toshkent",
    website: null,
    address: "Chilonzor tumani, Chilonzor-8, Qatortol ko'chasi, 60",
    description: "Kitob do'koni; Uzum Market'da ham do'koni bor.",
    sources: ["https://www.goldenpages.uz/en/rubrics/?Id=3583", "https://uzum.uz/uz/shop/bookuz"],
  },
  {
    slug: "kitob-olami",
    name: "Kitob olami",
    type: "STORE",
    city: "Toshkent",
    website: null, // manbalarda ikki xil sayt ko'rsatilgan — tasdiqlanmagan
    address: "Mustaqillik shoh ko'chasi, 6–7",
    description: "Kitob majmuasi (do'kon).",
    sources: [
      "https://www.afisha.uz/uz/places/knizhniy-kompleks-kitob-olami",
      "https://www.top-rated.online/cities/Tashkent/place/p/6711291/Kitob+Olami",
    ],
  },
  {
    slug: "yasira",
    name: "Yasira",
    type: "STORE",
    city: "Toshkent",
    website: null,
    address: "Chilonzor tumani, Bunyodkor shoh ko'chasi, 52/2 (filial: Furqat ko'chasi, 7)",
    description: "Kitob do'koni.",
    sources: ["https://www.afisha.uz/ru/gorod/2025/05/03/books"],
  },
  {
    slug: "gorod-knig",
    name: "Gorod knig",
    type: "STORE",
    city: "Toshkent",
    website: null,
    social: "instagram.com/gorod_knig_uz",
    address: "Atrium savdo markazi, 2-qavat",
    description: "2019-yilda bolalar kitoblari do'koni sifatida ochilgan, endi o'smirlar va kattalar uchun ham; O'zbekiston bo'ylab yetkazib berish.",
    sources: ["https://www.afisha.uz/ru/gorod/2025/05/03/books"],
  },
  {
    slug: "iread",
    name: "Iread",
    type: "STORE",
    city: "Toshkent",
    website: null,
    social: "instagram.com/iread_uz",
    address: "Magic City bog'i",
    description: "Ingliz va rus tilidagi litsenziyalangan kitoblar.",
    sources: ["https://www.afisha.uz/ru/gorod/2025/05/03/books"],
  },
  {
    slug: "xazina-books",
    name: "Xazina Books",
    type: "STORE",
    city: "Toshkent",
    website: null,
    address: "Magic City bog'i, Bobur ko'chasi, 174/12",
    description: "Bolalar kitoblari do'koni.",
    sources: ["https://avo.uz/uz/blog/post/top-7-best-childrens-bookstores"],
  },
  {
    slug: "sarmoya-books",
    name: "Sarmoya Books",
    type: "STORE",
    city: "Toshkent",
    website: null,
    description: "Kitob do'konlari tarmog'i (bir nechta filial).",
    sources: ["https://www.goldenpages.uz/uz/rubrics/?Id=110160"],
  },
  {
    slug: "mybook",
    name: "MyBook",
    type: "STORE",
    city: "Onlayn",
    website: null,
    social: "t.me/mybook_savdo",
    description: "Telegram va Instagram orqali ishlaydigan onlayn kitob do'koni; O'zbekiston bo'ylab yetkazib berish.",
    sources: ["https://t.me/s/mybook_savdo?before=6343", "https://www.instagram.com/mybook.savdo/"],
  },
  {
    slug: "munir",
    name: "Munir",
    type: "STORE",
    city: "Onlayn",
    website: null,
    description: "Mobil ilova orqali kitob do'koni: qog'oz, EPUB va audio kitoblar; O'zbekiston bo'ylab yetkazib berish.",
    sources: ["https://play.google.com/store/apps/details?id=org.uicgroup.munir"],
  },
  {
    slug: "kitoblar-olami-buxoro",
    name: "Kitoblar olami (Buxoro)",
    type: "STORE",
    city: "Buxoro",
    website: null,
    address: "Muhammad Iqbol ko'chasi",
    description: "Buxorodagi kitob do'koni.",
    sources: [
      "https://www.waze.com/live-map/directions/uz/buxoro-viloyati/buxoro/kitoblar-olami-kitob-dokoni?to=place.ChIJI55ehgwGUD8RE0bDUD_UBhE",
    ],
  },
  {
    slug: "andijonkitobsavdo",
    name: "Andijonkitobsavdo",
    type: "STORE",
    city: "Andijon",
    website: null,
    address: "Istiqlol ko'chasi, 8",
    description: "Andijondagi kitob savdosi korxonasi (faoliyati tasdiqlanmagan).",
    sources: ["https://dtm.uz/page/book_address"],
  },

  // ---------------- Nashriyotlar ----------------
  {
    slug: "akademnashr",
    name: "Akademnashr",
    type: "PUBLISHER",
    city: "Toshkent",
    website: "https://akademnashr.uz",
    address: "Chilonzor tumani, Chilonzor-20A, 42",
    description: "2004-yildan beri faoliyat yuritayotgan xususiy nashriyot: badiiy, ilmiy-ommabop va bolalar adabiyoti.",
    sources: ["https://german-stories.de/node/3416", "https://www.yellowpages.uz/uz/rubrika/nashriyotchilik-faoliyati/toshkent"],
  },
  {
    slug: "gafur-gulom-nmiu",
    name: "G'afur G'ulom nomidagi NMIU",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Shayxontohur tumani, Labzak ko'chasi, 86",
    description: "G'afur G'ulom nomidagi nashriyot-matbaa ijodiy uyi — o'zbek mumtoz va zamonaviy adabiyoti.",
    sources: ["https://www.goldenpages.uz/uz/company/?Id=1443"],
  },
  {
    slug: "ozbekiston-nashriyoti",
    name: "O'zbekiston nashriyoti",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Shayxontohur tumani, Navoiy ko'chasi, 30",
    description:
      "Davlat nashriyoti (DUK): rasmiy hujjatlar, ilmiy, ommabop va badiiy adabiyot. 2020-yilda \"O'zbekiston milliy ensiklopediyasi\" va \"Cho'lpon\" nashriyotlari negizida qayta tashkil etilgan.",
    sources: [
      "https://uz.wikipedia.org/wiki/O%CA%BBzbekiston_nashriyot-matbaa_ijodiy_uyi",
      "https://www.goldenpages.uz/uz/company/?Id=3532",
    ],
  },
  {
    slug: "yangi-asr-avlodi",
    name: "Yangi asr avlodi",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Qatortol ko'chasi, 60",
    description: "Bolalar adabiyoti, ilmiy-ommabop, darslik va badiiy kitoblar; Asaxiy va Uzum Market orqali ham sotiladi.",
    sources: [
      "https://kitobxon.com/oz/company/yangi_asr_avlodi",
      "https://asaxiy.uz/product/knigi/izdatelstvo=yangi-asr-avlodi",
      "https://uzum.uz/uz/shop/yangiasravlodinashriyoti",
    ],
  },
  {
    slug: "hilol-nashr",
    name: "Hilol Nashr",
    type: "PUBLISHER",
    city: "Toshkent",
    website: "https://hilolnashr.uz",
    description:
      "Shayx Muhammad Sodiq Muhammad Yusuf asos solgan nashriyot (2011): islomiy adabiyot. \"Kitoblar dunyosi\" onlayn do'koni orqali sotadi.",
    sources: [
      "https://hilolnashr.uz/",
      "https://kun.uz/news/2021/11/03/hilol-nashr-nashriyoti-10-yoshda",
    ],
  },
  {
    slug: "sharq-nmak",
    name: "Sharq NMAK",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Mirobod tumani, Buyuk Turon ko'chasi, 41 (manbalarda boshqa manzil ham bor)",
    description: "\"Sharq\" nashriyot-matbaa aksiyadorlik kompaniyasi: kitoblar, gazeta va jurnallar.",
    sources: [
      "https://www.goldenpages.uz/uz/company/?Id=1071",
      "https://kun.uz/news/2024/01/23/sharq-nashriyoti-binolari-moddiy-madaniy-meros-obektlari-royxatidan-chiqarildi",
    ],
  },
  {
    slug: "oqituvchi",
    name: "O'qituvchi",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "1936-yildan faoliyat yuritayotgan nashriyot; asosan maktab darsliklari.",
    sources: [
      "https://wikiwand.com/uz/O%CA%BBqituvchi_(nashriyot)",
      "https://kun.uz/news/2022/09/07/surishtiruv-maktab-darsliklarini-kimlar-chop-etyapti",
    ],
  },
  {
    slug: "fan-nashriyoti",
    name: "Fan nashriyoti",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Mirzo Ulug'bek ko'chasi, 81",
    description: "O'zbekiston Fanlar akademiyasi nashriyoti: ilmiy adabiyot.",
    sources: ["https://www.goldenpages.uz/uz/rubrics/?Id=1207"],
  },
  {
    slug: "adolat",
    name: "Adolat",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Buyuk Ipak yo'li ko'chasi, 69",
    description: "Rasmiy yuridik adabiyotga ixtisoslashgan nashriyot.",
    sources: ["https://18154-uz.all.biz/yuridicheskie-knigi-gg1066558"],
  },
  {
    slug: "davr-nashriyoti",
    name: "Davr nashriyoti",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    address: "Shayxontohur tumani, Navoiy shoh ko'chasi, 30",
    description: "Nashriyot.",
    sources: ["https://www.yellowpages.uz/rubrika/knigi-izdanie-pechat/tashkent/shajhantahurskij"],
  },
  {
    slug: "talim-nashriyoti",
    name: "Ta'lim nashriyoti",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Jurnallar, darsliklar va kitoblar nashri.",
    sources: ["https://top.uz/section/izdatelstva"],
  },
  {
    slug: "zabarjad-media",
    name: "Zabarjad Media",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Tarjima adabiyoti nashriyoti; Yoshlar ishlari agentligining hamkori sifatida tilga olingan.",
    sources: ["https://api-portal.gov.uz/uploads/64/2026/02/11/5f6edd95-dba0-d63c-89f4-8945ccf56b80_media_.pdf"],
  },
  {
    slug: "tamaddun",
    name: "Tamaddun",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Tarix, madaniyat va sivilizatsiya haqidagi kitoblar; Asaxiy orqali sotiladi.",
    sources: ["https://asaxiy.uz/product/knigi/izdatelstvo=tamaddun"],
  },
  {
    slug: "sharq-ziyo-zakovat",
    name: "Sharq-Ziyo-Zakovat",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Ma'rifiy va ta'lim adabiyoti; Asaxiy orqali sotiladi.",
    sources: ["https://asaxiy.uz/product/knigi/izdatelstvo=sharq-ziyo-zakovat"],
  },
  {
    slug: "ilm-ziyo-zakovat",
    name: "Ilm-Ziyo-Zakovat",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Nashriyot; kitoblari Olcha orqali rasmiy diler tomonidan sotiladi.",
    sources: ["https://olcha.uz/oz/manufacturer/izdatelstvo-ilm-zie-zakovat/knigi"],
  },
  {
    slug: "tirilish",
    name: "Tirilish",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Diniy, tarixiy va ma'naviy adabiyot; Asaxiy orqali sotiladi.",
    sources: ["https://asaxiy.uz/product/knigi/izdatelstvo=tirilish"],
  },
  {
    slug: "sano-standart",
    name: "Sano-standart",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Nashriyot (Kitobxon katalogida 40 dan ortiq asar).",
    sources: ["https://kitobxon.com/oz/companies"],
  },
  {
    slug: "navroz",
    name: "Navro'z",
    type: "PUBLISHER",
    city: "Toshkent",
    website: null,
    description: "Nashriyot (Kitobxon katalogida 70 dan ortiq asar).",
    sources: ["https://kitobxon.com/oz/companies"],
  },
];
