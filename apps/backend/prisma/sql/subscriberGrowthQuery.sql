SELECT 
  DATE_TRUNC('week', "createdAt") as date,
  COUNT(*) as count
FROM "public"."Subscriber"
WHERE "organizationId" = $1
AND "createdAt" >= $2
AND "createdAt" <= $3
GROUP BY DATE_TRUNC('week', "createdAt")
ORDER BY date ASC