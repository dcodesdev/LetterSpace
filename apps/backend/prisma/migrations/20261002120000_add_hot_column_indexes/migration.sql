-- CreateIndex
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- CreateIndex
CREATE INDEX "List_organizationId_idx" ON "List"("organizationId");

-- CreateIndex
CREATE INDEX "ListSubscriber_subscriberId_idx" ON "ListSubscriber"("subscriberId");

-- CreateIndex
CREATE INDEX "Message_campaignId_idx" ON "Message"("campaignId");

-- CreateIndex
CREATE INDEX "Message_subscriberId_idx" ON "Message"("subscriberId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

