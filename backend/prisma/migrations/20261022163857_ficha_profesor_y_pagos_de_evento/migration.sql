-- CreateEnum
CREATE TYPE "EventPaymentStatus" AS ENUM ('REPORTADO', 'CONFIRMADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "requiresPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "belt" "Belt",
ADD COLUMN     "hiredAt" DATE,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialty" TEXT;

-- CreateTable
CREATE TABLE "EventEnrollment" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "creditedToId" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "status" "EventPaymentStatus" NOT NULL DEFAULT 'REPORTADO',
    "enrolled" BOOLEAN NOT NULL DEFAULT false,
    "method" "PaymentMethod",
    "note" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" INTEGER,

    CONSTRAINT "EventEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEnrollment_creditedToId_idx" ON "EventEnrollment"("creditedToId");

-- CreateIndex
CREATE INDEX "EventEnrollment_status_idx" ON "EventEnrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollment_eventId_studentId_key" ON "EventEnrollment"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_creditedToId_fkey" FOREIGN KEY ("creditedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

