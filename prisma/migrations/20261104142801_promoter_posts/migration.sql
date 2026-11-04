-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('ARTICLE', 'PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PromoterPost" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'APPROVED',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "bookId" TEXT,
    "videoPlatform" TEXT,
    "videoId" TEXT,
    "videoUrl" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "PromoterPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoterPostImage" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromoterPostImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoterPost_promoterId_status_idx" ON "PromoterPost"("promoterId", "status");

-- CreateIndex
CREATE INDEX "PromoterPost_bookId_status_idx" ON "PromoterPost"("bookId", "status");

-- CreateIndex
CREATE INDEX "PromoterPost_status_createdAt_idx" ON "PromoterPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PromoterPostImage_postId_idx" ON "PromoterPostImage"("postId");

-- AddForeignKey
ALTER TABLE "PromoterPost" ADD CONSTRAINT "PromoterPost_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterPost" ADD CONSTRAINT "PromoterPost_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterPostImage" ADD CONSTRAINT "PromoterPostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PromoterPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

