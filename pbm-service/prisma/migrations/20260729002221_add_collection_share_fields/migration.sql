-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "collections_shareToken_key" ON "collections"("shareToken");

