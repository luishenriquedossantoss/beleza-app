-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mpUserId" TEXT;
