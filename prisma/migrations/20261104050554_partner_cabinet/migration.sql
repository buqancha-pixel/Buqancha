-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "partnerSince" TIMESTAMP(3),
ADD COLUMN     "partnerTokenHash" TEXT,
ADD COLUMN     "partnerUntil" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_partnerTokenHash_key" ON "Seller"("partnerTokenHash");

