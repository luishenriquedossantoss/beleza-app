-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder2hSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "abacatePayApiKey" TEXT;
