-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- CreateTable
CREATE TABLE "Dojo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dojo_pkey" PRIMARY KEY ("id")
);

-- Todo lo que ya existía pasa a ser del primer dojo.
INSERT INTO "Dojo" ("name", "updatedAt") VALUES ('Mi dojo', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "dojoId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Student" ADD COLUMN "dojoId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "dojoId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DojoClass" ADD COLUMN "dojoId" INTEGER NOT NULL DEFAULT 1;

-- El valor 0 no corresponde a ningún dojo: una fila que se intente guardar sin
-- dojo la rechaza la llave foránea, en lugar de caer en el primero.
ALTER TABLE "User" ALTER COLUMN "dojoId" SET DEFAULT 0;
ALTER TABLE "Student" ALTER COLUMN "dojoId" SET DEFAULT 0;
ALTER TABLE "Event" ALTER COLUMN "dojoId" SET DEFAULT 0;
ALTER TABLE "DojoClass" ALTER COLUMN "dojoId" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "User_dojoId_idx" ON "User"("dojoId");
CREATE INDEX "Student_dojoId_idx" ON "Student"("dojoId");
CREATE INDEX "Event_dojoId_idx" ON "Event"("dojoId");
CREATE INDEX "DojoClass_dojoId_idx" ON "DojoClass"("dojoId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DojoClass" ADD CONSTRAINT "DojoClass_dojoId_fkey" FOREIGN KEY ("dojoId") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
