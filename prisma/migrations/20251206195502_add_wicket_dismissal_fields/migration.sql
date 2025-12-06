-- AlterEnum
ALTER TYPE "WicketType" ADD VALUE 'CAUGHT_AND_BOWLED';

-- AlterTable
ALTER TABLE "Ball" ADD COLUMN     "dismissedBatsmanId" TEXT,
ADD COLUMN     "fielderId" TEXT;

-- AddForeignKey
ALTER TABLE "Ball" ADD CONSTRAINT "Ball_fielderId_fkey" FOREIGN KEY ("fielderId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
