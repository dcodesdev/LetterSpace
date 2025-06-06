/* !!! This is code generated by Prisma. Do not edit directly. !!!
/* eslint-disable */
"use strict";
const { makeTypedQueryFactory: $mkFactory } = require("../runtime/library");
exports.countDistinctRecipientsInTimeRange = /*#__PURE__*/ $mkFactory(
  'SELECT COUNT(DISTINCT "subscriberId")\nFROM "Message" m\nJOIN "Campaign" c ON m."campaignId" = c.id\nWHERE c."organizationId" = $1\nAND m."createdAt" >= $2\nAND m."createdAt" <= $3;',
);
