WITH organization_storage AS (
  -- Campaign content size 
  SELECT 
    c."organizationId",
    COALESCE(SUM(LENGTH(c.content)), 0) as campaign_size,
    COALESCE(SUM(LENGTH(c.subject)), 0) as campaign_subject_size,
    COUNT(*) as campaign_count
  FROM "Campaign" c
  WHERE c."organizationId" = $1
  GROUP BY c."organizationId"
),
template_storage AS (
  -- Template content size
  SELECT 
    t."organizationId",
    COALESCE(SUM(LENGTH(t.content)), 0) as template_size,
    COUNT(*) as template_count
  FROM "Template" t
  WHERE t."organizationId" = $1
  GROUP BY t."organizationId"
),
message_storage AS (
  -- Message content size through campaigns
  SELECT 
    c."organizationId",
    COALESCE(SUM(LENGTH(m.content)), 0) as message_size,
    COUNT(*) as message_count
  FROM "Message" m
  JOIN "Campaign" c ON c.id = m."campaignId"
  WHERE c."organizationId" = $1
  GROUP BY c."organizationId"
)

SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COALESCE(os.campaign_count, 0) as campaign_count,
  COALESCE(ts.template_count, 0) as template_count,
  COALESCE(ms.message_count, 0) as message_count,
  (
    COALESCE(os.campaign_size, 0) + 
    COALESCE(os.campaign_subject_size, 0) + 
    COALESCE(ts.template_size, 0) + 
    COALESCE(ms.message_size, 0)
  ) / 1024.0 / 1024.0 as total_size_mb
FROM "Organization" o
LEFT JOIN organization_storage os ON o.id = os."organizationId"
LEFT JOIN template_storage ts ON o.id = ts."organizationId"
LEFT JOIN message_storage ms ON o.id = ms."organizationId"
WHERE o.id = $1;