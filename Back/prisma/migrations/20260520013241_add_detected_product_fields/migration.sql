-- AlterTable
ALTER TABLE "DetectedProduct" ADD COLUMN     "category" TEXT,
ADD COLUMN     "positionX" DOUBLE PRECISION,
ADD COLUMN     "positionY" DOUBLE PRECISION,
ADD COLUMN     "price" INTEGER;
