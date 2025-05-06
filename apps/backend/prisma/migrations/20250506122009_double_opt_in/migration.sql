/*
  Warnings:

  - A unique constraint covering the columns `[emailVerificationToken]` on the table `Subscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_emailVerificationToken_key" ON "Subscriber"("emailVerificationToken");
