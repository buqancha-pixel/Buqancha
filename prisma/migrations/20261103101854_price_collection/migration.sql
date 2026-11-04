-- CreateEnum
CREATE TYPE "CollectorKind" AS ENUM ('NONE', 'FEED', 'PRODUCT_PAGE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "UnmatchedStatus" AS ENUM ('PENDING', 'MATCHED', 'IGNORED');

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "pendingPrice" INTEGER;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "collector" "CollectorKind" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "crawlDelayMs" INTEGER NOT NULL DEFAULT 3000,
ADD COLUMN     "feedUrl" TEXT;

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorRun" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "kind" "CollectorKind" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,

    CONSTRAINT "CollectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedItem" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "price" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "url" TEXT,
    "status" "UnmatchedStatus" NOT NULL DEFAULT 'PENDING',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnmatchedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_offerId_recordedAt_idx" ON "PriceSnapshot"("offerId", "recordedAt");

-- CreateIndex
CREATE INDEX "CollectorRun_sellerId_startedAt_idx" ON "CollectorRun"("sellerId", "startedAt");

-- CreateIndex
CREATE INDEX "UnmatchedItem_status_idx" ON "UnmatchedItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedItem_sellerId_key_key" ON "UnmatchedItem"("sellerId", "key");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorRun" ADD CONSTRAINT "CollectorRun_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedItem" ADD CONSTRAINT "UnmatchedItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
