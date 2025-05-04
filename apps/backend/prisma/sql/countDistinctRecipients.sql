SELECT COUNT(DISTINCT "subscriberId")
FROM "Message" m
JOIN "Campaign" c ON m."campaignId" = c.id
WHERE c."organizationId" = $1;