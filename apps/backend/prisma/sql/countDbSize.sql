WITH organization_storage AS (
  -- Campaign content size 
  SELECT 
    c."organizationId",
    COALESCE(SUM(LENGTH(c.content)), 0) as campaign_content_size,
    COALESCE(SUM(LENGTH(c.subject)), 0) as campaign_subject_size,
    COALESCE(SUM(LENGTH(c.title)), 0) as campaign_title_size,
    COALESCE(SUM(LENGTH(c.description)), 0) as campaign_description_size,
    COUNT(*) as campaign_count
  FROM "Campaign" c
  WHERE c."organizationId" = $1
  GROUP BY c."organizationId"
),
template_storage AS (
  -- Template content size
  SELECT 
    t."organizationId",
    COALESCE(SUM(LENGTH(t.content)), 0) as template_content_size,
    COALESCE(SUM(LENGTH(t.name)), 0) as template_name_size,
    COALESCE(SUM(LENGTH(t.description)), 0) as template_description_size,
    COUNT(*) as template_count
  FROM "Template" t
  WHERE t."organizationId" = $1
  GROUP BY t."organizationId"
),
message_storage AS (
  -- Message content size through campaigns
  SELECT 
    c."organizationId",
    COALESCE(SUM(LENGTH(m.content)), 0) as message_content_size,
    COALESCE(SUM(LENGTH(m.error)), 0) as message_error_size,
    COUNT(*) as message_count
  FROM "Message" m
  JOIN "Campaign" c ON c.id = m."campaignId"
  WHERE c."organizationId" = $1
  GROUP BY c."organizationId"
),
subscriber_storage AS (
  -- Subscriber data size
  SELECT
    s."organizationId",
    COALESCE(SUM(LENGTH(s.email)), 0) as subscriber_email_size,
    COALESCE(SUM(LENGTH(s.name)), 0) as subscriber_name_size,
    COUNT(*) as subscriber_count
  FROM "Subscriber" s
  WHERE s."organizationId" = $1
  GROUP BY s."organizationId"
),
list_storage AS (
  -- List data size
  SELECT
    l."organizationId",
    COALESCE(SUM(LENGTH(l.name)), 0) as list_name_size,
    COALESCE(SUM(LENGTH(l.description)), 0) as list_description_size,
    COUNT(*) as list_count
  FROM "List" l
  WHERE l."organizationId" = $1
  GROUP BY l."organizationId"
),
webhook_log_storage AS (
  -- Webhook log data size
  SELECT
    w."organizationId",
    COALESCE(SUM(LENGTH(wl."requestBody"::text)), 0) as webhook_request_size,
    COALESCE(SUM(LENGTH(wl."responseBody")), 0) as webhook_response_size,
    COALESCE(SUM(LENGTH(wl.error)), 0) as webhook_error_size,
    COUNT(*) as webhook_log_count
  FROM "WebhookLog" wl
  JOIN "Webhook" w ON w.id = wl."webhookId"
  WHERE w."organizationId" = $1
  GROUP BY w."organizationId"
)

SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COALESCE(os.campaign_count, 0) as campaign_count,
  COALESCE(ts.template_count, 0) as template_count,
  COALESCE(ms.message_count, 0) as message_count,
  COALESCE(ss.subscriber_count, 0) as subscriber_count,
  COALESCE(ls.list_count, 0) as list_count,
  COALESCE(wls.webhook_log_count, 0) as webhook_log_count,
  (
    COALESCE(os.campaign_content_size, 0) + 
    COALESCE(os.campaign_subject_size, 0) + 
    COALESCE(os.campaign_title_size, 0) +
    COALESCE(os.campaign_description_size, 0) +
    COALESCE(ts.template_content_size, 0) + 
    COALESCE(ts.template_name_size, 0) +
    COALESCE(ts.template_description_size, 0) +
    COALESCE(ms.message_content_size, 0) +
    COALESCE(ms.message_error_size, 0) +
    COALESCE(ss.subscriber_email_size, 0) +
    COALESCE(ss.subscriber_name_size, 0) +
    COALESCE(ls.list_name_size, 0) +
    COALESCE(ls.list_description_size, 0) +
    COALESCE(wls.webhook_request_size, 0) +
    COALESCE(wls.webhook_response_size, 0) +
    COALESCE(wls.webhook_error_size, 0)
  ) / 1024.0 / 1024.0 as total_size_mb
FROM "Organization" o
LEFT JOIN organization_storage os ON o.id = os."organizationId"
LEFT JOIN template_storage ts ON o.id = ts."organizationId"
LEFT JOIN message_storage ms ON o.id = ms."organizationId"
LEFT JOIN subscriber_storage ss ON o.id = ss."organizationId"
LEFT JOIN list_storage ls ON o.id = ls."organizationId"
LEFT JOIN webhook_log_storage wls ON o.id = wls."organizationId"
WHERE o.id = $1;