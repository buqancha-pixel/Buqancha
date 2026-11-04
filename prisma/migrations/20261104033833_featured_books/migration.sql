-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "featuredNote" TEXT;

-- CreateIndex
CREATE INDEX "Book_featuredAt_idx" ON "Book"("featuredAt");

-- CreateIndex
CREATE INDEX "Book_createdAt_idx" ON "Book"("createdAt");
