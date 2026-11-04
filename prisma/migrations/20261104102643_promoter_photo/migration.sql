-- AlterTable
ALTER TABLE "Promoter" ADD COLUMN     "photoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PromoterPhoto" (
    "promoterId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoterPhoto_pkey" PRIMARY KEY ("promoterId")
);

-- AddForeignKey
ALTER TABLE "PromoterPhoto" ADD CONSTRAINT "PromoterPhoto_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

