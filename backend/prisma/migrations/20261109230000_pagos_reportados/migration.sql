-- AlterEnum
ALTER TYPE "EquipmentRequestStatus" ADD VALUE 'REPORTADO';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "reportedAt" TIMESTAMP(3),
ADD COLUMN     "reportedMethod" "PaymentMethod";

