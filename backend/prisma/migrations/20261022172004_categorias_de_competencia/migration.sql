-- CreateEnum
CREATE TYPE "CompetitionGender" AS ENUM ('FEMENIL', 'VARONIL');

-- CreateEnum
CREATE TYPE "BeltClass" AS ENUM ('COLOR', 'NEGRA');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('INFANTIL_4_5', 'INFANTIL_6_7', 'INFANTIL_8_9', 'INFANTIL_10_11', 'INFANTIL_12_13', 'JUVENIL_14_15', 'JUVENIL_16_17', 'ADULTOS_18_35', 'U10_8_9', 'U12_10_11', 'U14_12_13', 'CADETE_14_15', 'JUNIOR_16_17', 'U21_18_20', 'SENIOR_21_35', 'MASTERS_36_MAS');

-- AlterTable
ALTER TABLE "EventEnrollment" DROP COLUMN "division",
ADD COLUMN     "ageCategory" "AgeCategory",
ADD COLUMN     "beltClass" "BeltClass",
ADD COLUMN     "gender" "CompetitionGender";

-- DropEnum
DROP TYPE "EventDivision";

