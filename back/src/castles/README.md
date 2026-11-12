# Player castles

Players unlock a private map castle at level 25. The Castle menu and castle leaderboard link to `/castle`.
Opponents are other players' castles, selected through Rankings → Scout castle → Review expedition.
Raids are timed, server-resolved army expeditions, not character tactical battles.

## Starting balance

- Foundation: 10,000 gold; one castle per profile. Includes level 1 Crownkeep, lumber mill and quarry,
  200 wood and 150 stone. Both production buildings are included to prevent spending the starter
  resources from permanently blocking progression.
- Placement: open mainland within 260 map units of Aurelia, Moonfall, Westmere or Larkhaven,
  with a 26-unit footprint and 180-unit minimum clearance from towns/landmarks, plus rectangular
  guards for wide labels and the Moonward Stones. Water, forest, bog and
  mountains are rejected on the server. Plots are private and may overlap between players.
  Existing crowded or distant castles move to a nearby valid plot around the same city on their next owner read/action;
  buildings, resources, armies and timers stay intact. Map markers scale with the atlas at every zoom,
  with icons slightly smaller than landmarks and a compact name label (no level).
- Six buildings, maximum level 10: keep, lumber mill, quarry, storehouse, barracks and forge.
  Other buildings cannot exceed the keep level. One construction and one training queue at a time.
- Wood: 120/hour per mill level. Stone: 90/hour per quarry level. Offline production stops at
  capacity: `1000 * keep² + 2000 * storehouse²` for each resource. Upgrades split production at
  their completion time, so higher rates are never applied retroactively.
- Barracks capacity: 20 units per level, including training and deployed troops. Oathguard,
  Thorn Rangers and Dawn Arcanists unlock at barracks levels 1, 2 and 3. Forge adds 10% army power per level.
- Raid duration: 3 minutes, followed by 30 minutes of rest. Targets must be within two keep levels.
  New castles have 24 hours of protection; defeated castles have 2 hours. Launching ends protection.
- Defense is `50 * keep + home army power`. Attack strength is fixed at departure; defense and
  available loot are evaluated on arrival. Victory requires attack strength at least equal to defense.
- Winning attackers lose 10–40% of each sent unit type; losing attackers lose 65% (rounded up).
  Defenders lose 30% on defeat or 10% on victory. Buildings are never destroyed.
- Winners take up to 10% of the defender's wood and stone, limited by free storage. Loot is
  transferred, not generated. If a target disappears or becomes protected in transit, troops return unharmed.
- Rating: 100 at foundation, 25 × the completed building's new level, and 20 + 5 × the enemy keep
  level per attack victory. Rankings show the top 100 castles. Reports retain the latest 30 in the UI.

Balance constants and formulas live in `castle-rules.ts`; authoritative map geometry lives in
`castle-terrain.ts`. `map-parity.spec.ts` checks river/mountain parity with the frontend map.

## Security and consistency

All endpoints require the existing game authentication guard. Ownership comes from the token,
never a submitted profile ID. DTOs validate coordinates, building/unit keys and integer army counts.
Foundation gold, resource spending, troop reservation, loot and reports use PostgreSQL transactions
and the existing per-user advisory lock. Two-player settlements acquire locks in sorted user-ID order.
Repeated requests cannot charge foundation twice, duplicate troops or resolve a raid twice.
Public leaderboard/scouting responses explicitly omit map coordinates and exact stored balances.

Production is calculated from server timestamps on reads/actions. A 15-second scheduled job settles
due raids for offline players; player reads/actions also settle due incoming/outgoing expeditions.

## Deployment and checks

With `NODE_ENV=development` (`npm run start:dev`), construction and upgrades finish immediately,
including an existing construction queue on the next castle read/action. Resource costs, prerequisites,
training and raids are unchanged. Production, test and unset environments retain normal construction timers.

From `back`, run `npx prisma migrate deploy`, `npx prisma generate`, then build/restart the backend
and deploy the rebuilt frontend. The migration `20261103120000_player_castles` adds only new castle
and report tables. It has already been applied to the local development database for this implementation.

- Backend rules/service/map tests: `npm test -- --runInBand src/castles`
- PostgreSQL concurrency/loot check: `npx ts-node test/castles.integration.ts`
  (creates two isolated temporary accounts and removes them in `finally`).
- Frontend presentation tests: `npm test`
- Browser fixture: from `front`, start `npx vite --config test/castle-preview.vite.config.ts`, then
  `PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/castle-preview.spec.ts --workers=1`.
  This fixture exercises actual components with mocked API responses and does not mutate player accounts.
