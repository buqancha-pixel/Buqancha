-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('STORE', 'PUBLISHER', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "OfferSource" AS ENUM ('PARTNER', 'AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameCyrl" TEXT,
    "bio" TEXT,
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "searchKey" TEXT NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleCyrl" TEXT,
    "description" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "coverColor" TEXT NOT NULL DEFAULT '#1f6f5c',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT NOT NULL,
    "year" INTEGER,
    "pages" INTEGER,
    "cover" TEXT,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SellerType" NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT,
    "searchUrlTemplate" TEXT,
    "description" TEXT,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "url" TEXT,
    "source" "OfferSource" NOT NULL DEFAULT 'MANUAL',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "type" "SellerType" NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE INDEX "Author_searchKey_idx" ON "Author"("searchKey");

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_searchKey_idx" ON "Book"("searchKey");

-- CreateIndex
CREATE INDEX "Book_searchCount_idx" ON "Book"("searchCount");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_isbn_key" ON "Edition"("isbn");

-- CreateIndex
CREATE INDEX "Edition_bookId_idx" ON "Edition"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_slug_key" ON "Seller"("slug");

-- CreateIndex
CREATE INDEX "Offer_sellerId_idx" ON "Offer"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_editionId_sellerId_key" ON "Offer"("editionId", "sellerId");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
