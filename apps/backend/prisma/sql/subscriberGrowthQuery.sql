SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as count
FROM "public"."Subscriber"
WHERE "organizationId" = $1
AND "createdAt" >= $2
AND "createdAt" <= $3
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY date ASC