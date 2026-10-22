-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "teacherId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teacherCode" TEXT;

-- CreateIndex
CREATE INDEX "Student_teacherId_idx" ON "Student"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherCode_key" ON "User"("teacherCode");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
