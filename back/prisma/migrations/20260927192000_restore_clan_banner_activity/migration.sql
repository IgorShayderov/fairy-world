-- Clan banners are permanent activity milestones, not purchases. Restore the
-- activity deducted by the previous implementation for every existing unlock.
UPDATE "Clan" AS clan
SET "activityPoints" = clan."activityPoints" + restored."activity"
FROM (
  SELECT
    "clanId",
    SUM(
      CASE "bannerCode"
        WHEN 'IRON_OATH' THEN 120
        WHEN 'VERDANT_HART' THEN 300
        WHEN 'MOONWATCH' THEN 600
        WHEN 'FROSTBOUND' THEN 1000
        WHEN 'SUN_CROWN' THEN 1800
        ELSE 0
      END
    )::INTEGER AS "activity"
  FROM "ClanBannerUnlock"
  GROUP BY "clanId"
) AS restored
WHERE clan."id" = restored."clanId";
