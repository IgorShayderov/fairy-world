-- One-time free respec for every player. Points are derived from level minus
-- allocated ranks, so clearing ranks refunds the full allowance without gems.
UPDATE "GameProfileSkillTree" SET "ranks" = '{}'::jsonb, "version" = "version" + 1;

-- Clear saved ability allocations too; never keep obsolete learned abilities
-- in an ongoing dungeon snapshot. Preserve health, mana, loot and progression.
UPDATE "DungeonRun"
SET "state" = jsonb_set(
  jsonb_set("state", '{player,skillState,ranks}', '{}'::jsonb, false),
  '{skills,abilities}', '[]'::jsonb, false
);
UPDATE "DungeonRun" AS run
SET "state" = jsonb_set(run."state", '{party,members}', (
  SELECT jsonb_agg(jsonb_set(member, '{skillState,ranks}', '{}'::jsonb, false) ORDER BY ordinal)
  FROM jsonb_array_elements(run."state" #> '{party,members}') WITH ORDINALITY AS members(member, ordinal)
), false)
WHERE jsonb_array_length(COALESCE("state" #> '{party,members}', '[]'::jsonb)) > 0;
