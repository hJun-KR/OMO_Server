-- CreateTable
CREATE TABLE "FashionSearch" (
    "id" TEXT NOT NULL,
    "originalImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FashionSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FashionItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "croppedImage" TEXT NOT NULL,
    "brand" TEXT,
    "brandConfidence" DOUBLE PRECISION,
    "searchQuery" TEXT,
    "searchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FashionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FashionProduct" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "price" INTEGER,
    "image" TEXT,
    "link" TEXT,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "FashionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FashionItem_searchId_idx" ON "FashionItem"("searchId");

-- CreateIndex
CREATE INDEX "FashionProduct_itemId_idx" ON "FashionProduct"("itemId");

-- AddForeignKey
ALTER TABLE "FashionItem" ADD CONSTRAINT "FashionItem_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "FashionSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FashionProduct" ADD CONSTRAINT "FashionProduct_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FashionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
