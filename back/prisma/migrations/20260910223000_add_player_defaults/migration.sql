BEGIN;

ALTER TABLE "GameProfile"
ADD COLUMN "freeAttributes" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "Attribute" ("name", "description") VALUES
  ('STRENGTH', 'Increases Damage by 2 per point.'),
  ('AGILITY', 'Increases Dodge and Critical chance by 0.5 per point.'),
  ('ENDURANCE', 'Increases Health by 10 and Defense by 1 per point.'),
  ('WISDOM', 'Increases Mana by 5 per point.'),
  ('CHARISMA', 'Increases Critical damage by 1 per point.')
ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "Stat" ("name", "description") VALUES
  ('HEALTH', 'Maximum health points.'),
  ('MANA', 'Maximum mana points.'),
  ('DAMAGE', 'Base damage dealt by attacks.'),
  ('DEFENSE', 'Reduces incoming damage.'),
  ('CRIT', 'Chance to land a critical hit.'),
  ('DODGE', 'Chance to avoid an attack.'),
  ('CRIT_DAMAGE', 'Additional damage dealt by critical hits.')
ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "ProfileAttribute" ("gameProfileId", "attributeId", "value")
SELECT profile."id", attribute."id", 5
FROM "GameProfile" profile
CROSS JOIN "Attribute" attribute
ON CONFLICT ("gameProfileId", "attributeId") DO UPDATE
SET "value" = GREATEST("ProfileAttribute"."value", EXCLUDED."value");

INSERT INTO "ProfileStat" ("gameProfileId", "statId", "value")
SELECT
  profile."id",
  stat."id",
  CASE stat."name"
    WHEN 'HEALTH' THEN 50
    WHEN 'MANA' THEN 10
    WHEN 'DAMAGE' THEN 1
    ELSE 0
  END
FROM "GameProfile" profile
CROSS JOIN "Stat" stat
ON CONFLICT ("gameProfileId", "statId") DO UPDATE
SET "value" = GREATEST("ProfileStat"."value", EXCLUDED."value");

COMMIT;
