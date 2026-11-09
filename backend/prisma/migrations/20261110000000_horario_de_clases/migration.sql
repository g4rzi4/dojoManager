-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('KARATE', 'JUDO', 'TAEKWONDO', 'DEFENSA_PERSONAL', 'ACONDICIONAMIENTO');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('PRINCIPIANTES', 'INTERMEDIOS', 'AVANZADOS', 'MIXTO');

-- CreateTable
CREATE TABLE "DojoClass" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DojoClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DojoClass_dayOfWeek_idx" ON "DojoClass"("dayOfWeek");

-- CreateIndex
CREATE INDEX "DojoClass_teacherId_idx" ON "DojoClass"("teacherId");

-- AddForeignKey
ALTER TABLE "DojoClass" ADD CONSTRAINT "DojoClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

