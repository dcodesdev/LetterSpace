/*
  Warnings:

  - A unique constraint covering the columns `[emailVerificationToken]` on the table `Subscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "cleanupInterval" INTEGER DEFAULT 7;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "SubscriberMetadata" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriberMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberMetadata_subscriberId_key_key" ON "SubscriberMetadata"("subscriberId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_emailVerificationToken_key" ON "Subscriber"("emailVerificationToken");

-- AddForeignKey
ALTER TABLE "SubscriberMetadata" ADD CONSTRAINT "SubscriberMetadata_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
