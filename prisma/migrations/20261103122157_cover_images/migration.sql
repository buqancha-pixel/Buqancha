-- AlterTable
ALTER TABLE "Edition" ADD COLUMN     "imageSource" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "allowImages" BOOLEAN NOT NULL DEFAULT true;
