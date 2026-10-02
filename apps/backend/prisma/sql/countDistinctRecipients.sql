SELECT COUNT(DISTINCT "subscriberId")
FROM "Message" m
JOIN "Campaign" c ON m."campaignId" = c.id
WHERE c."organizationId" = $1
  AND m."status" IN ('SENT', 'AWAITING_WEBHOOK', 'OPENED', 'CLICKED', 'FAILED', 'COMPLAINED');
