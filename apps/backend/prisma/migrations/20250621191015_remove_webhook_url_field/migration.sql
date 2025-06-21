/*
  Warnings:

  - You are about to drop the column `url` on the `Webhook` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Webhook_organizationId_url_key";

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "url";
