-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReminder_paymentId_idx" ON "PaymentReminder"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentReminder_sentAt_idx" ON "PaymentReminder"("sentAt");

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
