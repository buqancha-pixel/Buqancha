/**
 * Namunaviy ma'lumotlar.
 *
 * Sotuvchilar — O'zbekistondagi real do'kon, marketpleys va nashriyotlar
 * (katalog: prisma/data/sellers.ts). Namunaviy narxlar faqat 5 tasida.
 * NARXLAR NAMUNAVIY: ular haqiqiy narxlar emas, faqat saytni sinash uchun.
 * Shuning uchun barcha takliflar `isSample: true` bilan belgilanadi va
 * saytda ogohlantirish ko'rsatiladi. Narx yig'ish keyingi bosqichda.
 */
import { PrismaClient, OfferSource } from "@prisma/client";
import { buildSearchKey, slugify } from "../lib/normalize.ts";
import { SELLERS } from "./data/sellers.ts";

const prisma = new PrismaClient();

const sellers = SELLERS;

const PUBLISHER_SELLER: Record<string, string> = {
  Akademnashr: "akademnashr",
  "G'afur G'ulom nomidagi NMIU": "gafur-gulom-nmiu",
};

type AuthorSeed = {
  name: string;
  nameCyrl: string;
  birthYear?: number;
  deathYear?: number;
  bio: string;
};

const authors: Record<string, AuthorSeed> = {
  qodiriy: {
    name: "Abdulla Qodiriy",
    nameCyrl: "Абдулла Қодирий",
    birthYear: 1894,
    deathYear: 1938,
    bio: "O'zbek romanchiligining asoschisi. \"O'tkan kunlar\" — o'zbek adabiyotidagi birinchi roman.",
  },
  cholpon: {
    name: "Cho'lpon",
    nameCyrl: "Чўлпон",
    birthYear: 1897,
    deathYear: 1938,
    bio: "Shoir, yozuvchi, dramaturg va tarjimon. Asl ismi Abdulhamid Sulaymon o'g'li.",
  },
  gafurgulom: {
    name: "G'afur G'ulom",
    nameCyrl: "Ғафур Ғулом",
    birthYear: 1903,
    deathYear: 1966,
    bio: "Shoir va nosir. \"Shum bola\" qissasi bilan keng tanilgan.",
  },
  oybek: {
    name: "Oybek",
    nameCyrl: "Ойбек",
    birthYear: 1905,
    deathYear: 1968,
    bio: "Shoir, yozuvchi va olim. Asl ismi Muso Toshmuhammad o'g'li.",
  },
  qahhor: {
    name: "Abdulla Qahhor",
    nameCyrl: "Абдулла Қаҳҳор",
    birthYear: 1907,
    deathYear: 1968,
    bio: "Hikoya ustasi, romanchi va dramaturg.",
  },
  hoshimov: {
    name: "O'tkir Hoshimov",
    nameCyrl: "Ўткир Ҳошимов",
    birthYear: 1941,
    deathYear: 2013,
    bio: "Yozuvchi va publitsist, \"Dunyoning ishlari\" va \"Ikki eshik orasi\" muallifi.",
  },
  saidahmad: {
    name: "Said Ahmad",
    nameCyrl: "Саид Аҳмад",
    birthYear: 1920,
    deathYear: 2007,
    bio: "Yozuvchi, \"Ufq\" trilogiyasi va \"Kelinlar qo'zg'oloni\" komediyasi muallifi.",
  },
  toxtaboyev: {
    name: "Xudoyberdi To'xtaboyev",
    nameCyrl: "Худойберди Тўхтабоев",
    bio: "Bolalar yozuvchisi, \"Sariq devni minib\" sarguzasht romani muallifi.",
  },
  tohirmalik: {
    name: "Tohir Malik",
    nameCyrl: "Тоҳир Малик",
    bio: "Yozuvchi, \"Shaytanat\" turkum romanlari muallifi.",
  },
  navoiy: {
    name: "Alisher Navoiy",
    nameCyrl: "Алишер Навоий",
    birthYear: 1441,
    deathYear: 1501,
    bio: "Buyuk shoir va mutafakkir, \"Xamsa\" muallifi.",
  },
};

type BookSeed = {
  title: string;
  titleCyrl: string;
  author: keyof typeof authors;
  description: string;
  color: string;
  searchCount: number;
  editions: Array<{
    publisher: string;
    year: number;
    pages: number;
    cover: "qattiq" | "yumshoq";
    // sotuvchi slug → narx (so'm); manfiy qiymat = mavjud emas
    offers: Record<string, number>;
  }>;
};

const books: BookSeed[] = [
  {
    title: "O'tkan kunlar",
    titleCyrl: "Ўткан кунлар",
    author: "qodiriy",
    description:
      "Otabek va Kumushning muhabbati, XIX asr Turkistoni hayoti haqidagi tarixiy roman. O'zbek adabiyotidagi birinchi roman.",
    color: "#7a2e2e",
    searchCount: 980,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2023,
        pages: 416,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 39000, asaxiy: 45000, "uzum-market": 42000, topar: 49000 },
      },
      {
        publisher: "Akademnashr",
        year: 2022,
        pages: 400,
        cover: "yumshoq",
        offers: { akademnashr: 41000, "uzum-market": 44000, asaxiy: -47000 },
      },
    ],
  },
  {
    title: "Mehrobdan chayon",
    titleCyrl: "Меҳробдан чаён",
    author: "qodiriy",
    description: "Anvar va Ra'no taqdiri orqali Xudoyorxon davri saroy hayoti va zulmini ko'rsatuvchi roman.",
    color: "#4a3b6b",
    searchCount: 410,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2023,
        pages: 320,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 35000, asaxiy: 39000, "uzum-market": 37000, topar: 42000 },
      },
    ],
  },
  {
    title: "Kecha va kunduz",
    titleCyrl: "Кеча ва кундуз",
    author: "cholpon",
    description: "Zebi taqdiri orqali mustamlaka davridagi jamiyat va inson erkinligi haqida roman.",
    color: "#1d3557",
    searchCount: 760,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2023,
        pages: 352,
        cover: "qattiq",
        offers: { akademnashr: 44000, asaxiy: 48000, "uzum-market": 46500, topar: 52000 },
      },
    ],
  },
  {
    title: "Shum bola",
    titleCyrl: "Шум бола",
    author: "gafurgulom",
    description: "Sho'x va zukko bolaning sarguzashtlari haqidagi yumoristik qissa.",
    color: "#e09f3e",
    searchCount: 690,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2024,
        pages: 192,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 28000, asaxiy: 32000, "uzum-market": 30000, topar: -34000 },
      },
    ],
  },
  {
    title: "Navoiy",
    titleCyrl: "Навоий",
    author: "oybek",
    description: "Alisher Navoiy hayoti va Hirot davri haqidagi tarixiy-biografik roman.",
    color: "#2a6f97",
    searchCount: 320,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2022,
        pages: 464,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 52000, asaxiy: 58000, topar: 61000 },
      },
    ],
  },
  {
    title: "Qutlug' qon",
    titleCyrl: "Қутлуғ қон",
    author: "oybek",
    description: "Yo'lchi va Gulnor taqdiri orqali 1916-yil voqealari arafasidagi hayot tasvirlangan roman.",
    color: "#9b2226",
    searchCount: 210,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2021,
        pages: 384,
        cover: "yumshoq",
        offers: { akademnashr: 38000, "uzum-market": 41000, asaxiy: 43000 },
      },
    ],
  },
  {
    title: "Sarob",
    titleCyrl: "Сароб",
    author: "qahhor",
    description: "Saidiy timsolida shaxs va zamon ziddiyatini ko'rsatuvchi psixologik roman.",
    color: "#6c757d",
    searchCount: 180,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2021,
        pages: 288,
        cover: "yumshoq",
        offers: { "gafur-gulom-nmiu": 33000, asaxiy: 36000, "uzum-market": 35000 },
      },
    ],
  },
  {
    title: "Dunyoning ishlari",
    titleCyrl: "Дунёнинг ишлари",
    author: "hoshimov",
    description: "Ona haqidagi samimiy hikoyalar to'plami — o'zbek kitobxonlari eng sevgan asarlardan biri.",
    color: "#588157",
    searchCount: 870,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2024,
        pages: 224,
        cover: "qattiq",
        offers: { akademnashr: 34000, asaxiy: 37000, "uzum-market": 35500, topar: 39000 },
      },
    ],
  },
  {
    title: "Ikki eshik orasi",
    titleCyrl: "Икки эшик ораси",
    author: "hoshimov",
    description: "Urush va urushdan keyingi yillardagi qishloq hayoti, insonlar taqdiri haqida roman.",
    color: "#3a5a40",
    searchCount: 540,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2023,
        pages: 512,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 55000, asaxiy: 62000, "uzum-market": 59000, topar: 64000 },
      },
    ],
  },
  {
    title: "Bahor qaytmaydi",
    titleCyrl: "Баҳор қайтмайди",
    author: "hoshimov",
    description: "Yoshlik, orzu va hayot tanlovlari haqida qissa.",
    color: "#a3b18a",
    searchCount: 260,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2022,
        pages: 176,
        cover: "yumshoq",
        offers: { akademnashr: 26000, "uzum-market": 28000, asaxiy: 29000, topar: -31000 },
      },
    ],
  },
  {
    title: "Ufq",
    titleCyrl: "Уфқ",
    author: "saidahmad",
    description: "Urush yillari va undan keyingi davrda o'zbek xalqi hayotini tasvirlovchi trilogiya.",
    color: "#bc6c25",
    searchCount: 230,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2022,
        pages: 640,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 68000, asaxiy: 75000, topar: 79000 },
      },
    ],
  },
  {
    title: "Sariq devni minib",
    titleCyrl: "Сариқ девни миниб",
    author: "toxtaboyev",
    description: "Hoshimjonning sehrli qalpoqcha bilan boshidan kechirgan kulgili sarguzashtlari.",
    color: "#f4a261",
    searchCount: 720,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2024,
        pages: 256,
        cover: "qattiq",
        offers: { akademnashr: 32000, asaxiy: 36000, "uzum-market": 34000, topar: 38000 },
      },
    ],
  },
  {
    title: "Shaytanat",
    titleCyrl: "Шайтанат",
    author: "tohirmalik",
    description: "Jinoyat olami va unga qarshi kurash haqidagi ko'p kitobli sarguzasht roman (1-kitob).",
    color: "#212529",
    searchCount: 650,
    editions: [
      {
        publisher: "G'afur G'ulom nomidagi NMIU",
        year: 2023,
        pages: 480,
        cover: "qattiq",
        offers: { "gafur-gulom-nmiu": 49000, asaxiy: 54000, "uzum-market": 51000, topar: 57000 },
      },
    ],
  },
  {
    title: "Lison ut-tayr",
    titleCyrl: "Лисон ут-тайр",
    author: "navoiy",
    description: "Qushlar tilidan hikoya qilinuvchi falsafiy-irfoniy doston.",
    color: "#0f4c5c",
    searchCount: 150,
    editions: [
      {
        publisher: "Akademnashr",
        year: 2021,
        pages: 368,
        cover: "qattiq",
        offers: { akademnashr: 46000, asaxiy: 51000, topar: -55000 },
      },
    ],
  },
];

async function main() {
  await prisma.offer.deleteMany();
  await prisma.edition.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.seller.deleteMany();

  const sellerIds: Record<string, string> = {};
  for (const s of sellers) {
    const created = await prisma.seller.create({ data: { ...s, searchUrlTemplate: s.searchUrlTemplate ?? null, sitemapUrls: s.sitemapUrls ?? [] } });
    sellerIds[s.slug] = created.id;
  }

  const authorIds: Record<string, string> = {};
  for (const [key, a] of Object.entries(authors)) {
    const created = await prisma.author.create({
      data: { ...a, slug: slugify(a.name), searchKey: buildSearchKey(a.name, a.nameCyrl) },
    });
    authorIds[key] = created.id;
  }

  for (const b of books) {
    const author = authors[b.author];
    const book = await prisma.book.create({
      data: {
        slug: slugify(b.title),
        title: b.title,
        titleCyrl: b.titleCyrl,
        description: b.description,
        coverColor: b.color,
        searchCount: b.searchCount,
        authorId: authorIds[b.author],
        searchKey: buildSearchKey(b.title, b.titleCyrl, author.name, author.nameCyrl),
      },
    });

    for (const e of b.editions) {
      const edition = await prisma.edition.create({
        data: { bookId: book.id, publisher: e.publisher, year: e.year, pages: e.pages, cover: e.cover },
      });
      for (const [sellerSlug, rawPrice] of Object.entries(e.offers)) {
        const seller = sellers.find((s) => s.slug === sellerSlug)!;
        // nashriyot faqat o'z nashrini sotadi
        if (seller.type === "PUBLISHER" && PUBLISHER_SELLER[e.publisher] !== sellerSlug) {
          throw new Error(`${seller.name} ${e.publisher} nashrini sota olmaydi (${b.title})`);
        }
        const url = seller.searchUrlTemplate
          ? seller.searchUrlTemplate.replace("{q}", encodeURIComponent(b.title))
          : seller.website;
        await prisma.offer.create({
          data: {
            editionId: edition.id,
            sellerId: sellerIds[sellerSlug],
            price: Math.abs(rawPrice),
            inStock: rawPrice > 0,
            url,
            source: OfferSource.MANUAL,
            isSample: true,
          },
        });
      }
    }
  }

  const count = await prisma.offer.count();
  console.log(`Seed tayyor: ${books.length} kitob, ${sellers.length} sotuvchi, ${count} taklif.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
