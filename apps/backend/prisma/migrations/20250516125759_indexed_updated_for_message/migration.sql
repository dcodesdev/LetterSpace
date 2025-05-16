-- DropIndex
DROP INDEX "Message_createdAt_id_idx";

-- CreateIndex
CREATE INDEX "Message_updatedAt_id_idx" ON "Message"("updatedAt", "id");
