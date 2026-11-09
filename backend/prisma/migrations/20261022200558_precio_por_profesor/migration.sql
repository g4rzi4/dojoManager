-- CreateTable
CREATE TABLE "TeacherModalityPrice" (
    "id" SERIAL NOT NULL,
    "modalityId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherModalityPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherModalityPrice_teacherId_idx" ON "TeacherModalityPrice"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherModalityPrice_modalityId_teacherId_key" ON "TeacherModalityPrice"("modalityId", "teacherId");

-- AddForeignKey
ALTER TABLE "TeacherModalityPrice" ADD CONSTRAINT "TeacherModalityPrice_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "EventModality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherModalityPrice" ADD CONSTRAINT "TeacherModalityPrice_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

