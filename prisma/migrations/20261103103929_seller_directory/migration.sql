-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "address" TEXT,
ADD COLUMN     "social" TEXT,
ADD COLUMN     "sources" TEXT[] DEFAULT ARRAY[]::TEXT[];
