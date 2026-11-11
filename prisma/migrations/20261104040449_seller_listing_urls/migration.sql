-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "listingUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
