-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "photoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SellerPhoto" (
    "sellerId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPhoto_pkey" PRIMARY KEY ("sellerId")
);

-- AddForeignKey
ALTER TABLE "SellerPhoto" ADD CONSTRAINT "SellerPhoto_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

