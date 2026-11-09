-- AlterTable
ALTER TABLE "EventEnrollment" ADD COLUMN "externalReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollment_externalReference_key" ON "EventEnrollment"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalReference_key" ON "Payment"("externalReference");
