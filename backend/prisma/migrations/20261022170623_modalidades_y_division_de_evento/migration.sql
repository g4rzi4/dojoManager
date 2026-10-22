-- CreateEnum
CREATE TYPE "EventDivision" AS ENUM ('INFANTIL', 'JUVENIL', 'ADULTO');

-- AlterTable
ALTER TABLE "EventEnrollment" ADD COLUMN     "division" "EventDivision";

-- CreateTable
CREATE TABLE "EventModality" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventModality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEnrollmentModality" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "modalityId" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "EventEnrollmentModality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventModality_eventId_name_key" ON "EventModality"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollmentModality_enrollmentId_modalityId_key" ON "EventEnrollmentModality"("enrollmentId", "modalityId");

-- AddForeignKey
ALTER TABLE "EventModality" ADD CONSTRAINT "EventModality_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollmentModality" ADD CONSTRAINT "EventEnrollmentModality_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "EventEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollmentModality" ADD CONSTRAINT "EventEnrollmentModality_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "EventModality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

