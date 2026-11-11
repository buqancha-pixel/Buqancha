-- AlterEnum
ALTER TYPE "SellerType" ADD VALUE 'ONLINE';

-- CreateTable
CREATE TABLE "RemovedSeller" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemovedSeller_pkey" PRIMARY KEY ("slug")
);

