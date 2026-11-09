-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ES', 'EN');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "FontSize" AS ENUM ('SMALL', 'NORMAL', 'LARGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'ES',
ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'LIGHT',
ADD COLUMN     "fontSize" "FontSize" NOT NULL DEFAULT 'NORMAL';
