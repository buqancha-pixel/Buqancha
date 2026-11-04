-- AlterTable
ALTER TABLE "Promoter" ADD COLUMN     "tokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Promoter_tokenHash_key" ON "Promoter"("tokenHash");

