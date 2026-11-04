-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "importLanguages" TEXT[] DEFAULT ARRAY['uz']::TEXT[];
