-- CreateTable
CREATE TABLE "Promoter" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "about" TEXT,
    "followers" TEXT,
    "photoUrl" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promoter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoterBook" (
    "promoterId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoterBook_pkey" PRIMARY KEY ("promoterId","bookId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promoter_slug_key" ON "Promoter"("slug");

-- CreateIndex
CREATE INDEX "PromoterBook_bookId_idx" ON "PromoterBook"("bookId");

-- AddForeignKey
ALTER TABLE "PromoterBook" ADD CONSTRAINT "PromoterBook_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterBook" ADD CONSTRAINT "PromoterBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

