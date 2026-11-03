-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'manual';
UPDATE "Book" SET "origin" = 'import' WHERE "description" = '';
