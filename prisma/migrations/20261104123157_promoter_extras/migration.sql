-- AlterTable
ALTER TABLE "Promoter" ADD COLUMN     "bannerAt" TIMESTAMP(3),
ADD COLUMN     "readingBookId" TEXT;

-- AlterTable
ALTER TABLE "PromoterBook" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "PromoterBanner" (
    "promoterId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoterBanner_pkey" PRIMARY KEY ("promoterId")
);

-- CreateTable
CREATE TABLE "PromoterList" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "about" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoterList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoterListBook" (
    "listId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromoterListBook_pkey" PRIMARY KEY ("listId","bookId")
);

-- CreateTable
CREATE TABLE "PromoterStat" (
    "promoterId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromoterStat_pkey" PRIMARY KEY ("promoterId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoterList_promoterId_slug_key" ON "PromoterList"("promoterId", "slug");

-- CreateIndex
CREATE INDEX "PromoterListBook_bookId_idx" ON "PromoterListBook"("bookId");

-- AddForeignKey
ALTER TABLE "Promoter" ADD CONSTRAINT "Promoter_readingBookId_fkey" FOREIGN KEY ("readingBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterBanner" ADD CONSTRAINT "PromoterBanner_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterList" ADD CONSTRAINT "PromoterList_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterListBook" ADD CONSTRAINT "PromoterListBook_listId_fkey" FOREIGN KEY ("listId") REFERENCES "PromoterList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterListBook" ADD CONSTRAINT "PromoterListBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterStat" ADD CONSTRAINT "PromoterStat_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

