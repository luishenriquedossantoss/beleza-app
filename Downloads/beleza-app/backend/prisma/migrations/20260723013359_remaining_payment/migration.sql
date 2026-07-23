-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "remainingCents" INTEGER,
ADD COLUMN     "remainingPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remainingPixTxId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "abacatePayApiKey" TEXT;
