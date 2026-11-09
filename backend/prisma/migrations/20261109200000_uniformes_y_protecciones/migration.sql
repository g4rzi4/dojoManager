-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('UNIFORME', 'PROTECCION');

-- CreateEnum
CREATE TYPE "EquipmentRequestStatus" AS ENUM ('SOLICITADO', 'CONFIRMADO', 'PAGADO', 'ENTREGADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "EquipmentBrand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EquipmentBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sizes" TEXT[],
    "colors" TEXT[],

    CONSTRAINT "EquipmentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentModel" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isExample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EquipmentModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentRequest" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "requestedById" INTEGER,
    "teacherId" INTEGER,
    "status" "EquipmentRequestStatus" NOT NULL DEFAULT 'SOLICITADO',
    "amountCents" INTEGER,
    "note" TEXT,
    "staffNote" TEXT,
    "method" "PaymentMethod",
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "EquipmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentRequestItem" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "productId" INTEGER,
    "modelId" INTEGER,
    "productName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "modelName" TEXT,
    "size" TEXT NOT NULL,
    "color" TEXT,
    "priceCents" INTEGER,

    CONSTRAINT "EquipmentRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentBrand_name_key" ON "EquipmentBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentProduct_name_key" ON "EquipmentProduct"("name");

-- CreateIndex
CREATE INDEX "EquipmentModel_productId_idx" ON "EquipmentModel"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentModel_productId_brandId_name_key" ON "EquipmentModel"("productId", "brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentRequest_externalReference_key" ON "EquipmentRequest"("externalReference");

-- CreateIndex
CREATE INDEX "EquipmentRequest_studentId_idx" ON "EquipmentRequest"("studentId");

-- CreateIndex
CREATE INDEX "EquipmentRequest_teacherId_idx" ON "EquipmentRequest"("teacherId");

-- CreateIndex
CREATE INDEX "EquipmentRequest_status_idx" ON "EquipmentRequest"("status");

-- CreateIndex
CREATE INDEX "EquipmentRequestItem_requestId_idx" ON "EquipmentRequestItem"("requestId");

-- AddForeignKey
ALTER TABLE "EquipmentModel" ADD CONSTRAINT "EquipmentModel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EquipmentProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentModel" ADD CONSTRAINT "EquipmentModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "EquipmentBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequest" ADD CONSTRAINT "EquipmentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequest" ADD CONSTRAINT "EquipmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequest" ADD CONSTRAINT "EquipmentRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequestItem" ADD CONSTRAINT "EquipmentRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EquipmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequestItem" ADD CONSTRAINT "EquipmentRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EquipmentProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentRequestItem" ADD CONSTRAINT "EquipmentRequestItem_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "EquipmentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

