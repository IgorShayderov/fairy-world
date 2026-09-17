# Fairy World

[![Project checks](https://github.com/IgorShayderov/fairy-world/actions/workflows/project-check.yml/badge.svg)](https://github.com/IgorShayderov/fairy-world/actions/workflows/project-check.yml)

Fairy World is a browser-based RPG built as a small monorepo. Players can explore a fantasy map, encounter generated monsters, manage character attributes and equipment, and trade generated items in persistent shops.

## Technology

- Frontend: Vue 3, Quasar, TypeScript, Pinia, Tailwind CSS, Three.js
- Backend: NestJS, TypeScript, Prisma 7, PostgreSQL, Socket.IO
- Tests: Vitest on the frontend and Jest on the backend
- CI: GitHub Actions

## Requirements

- Node.js 24
- npm
- PostgreSQL
- Docker, only if you want to run the included Mailpit service

The repository's Docker Compose configuration does not provide PostgreSQL. Use a local PostgreSQL installation or supply a connection URL for an existing database.

## Local setup

### 1. Install dependencies

From the repository root:

```bash
make install
```

You can also install each application separately:

```bash
cd front && npm install
cd ../back && npm install
```

### 2. Configure the backend

Create `back/.env`:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/fairy_world_dev"

PORT=3333
FRONT_URL=http://localhost:9001
JWT_SECRET=replace-with-a-long-random-secret

ACCESS_COOKIE_LIFETIME=86400000
REFRESH_COOKIE_LIFETIME=604800000
RESET_PASSWORD_TOKEN_LIFETIME=3600000

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=no-reply@fairy-world.local

ENABLE_LOGS=TRUE
```

`SMTP_USER` and `SMTP_PASSWORD` are optional for local Mailpit usage.

### 3. Configure the frontend

Copy the example file:

```bash
cp front/.env.example front/.env
```

The default frontend configuration points to `http://localhost:3333`.

### 4. Prepare the database

Create the database referenced by `DATABASE_URL`, then apply migrations and seed development data:

```bash
cd back
npx prisma migrate deploy
npx prisma db seed
```

Prisma Client is generated automatically before backend lint and build commands. To generate it manually, run:

```bash
cd back
npx prisma generate
```

### 5. Start Mailpit (optional)

Mailpit captures password-reset emails during local development:

```bash
docker compose up -d mailpit
```

Its web interface is available at [http://localhost:8025](http://localhost:8025).

### 6. Start the applications

Run these commands in separate terminals from the repository root:

```bash
make dev-back
make dev-front
```

- Game: [http://localhost:9001](http://localhost:9001)
- REST API: [http://localhost:3333/api/v1](http://localhost:3333/api/v1)
- Swagger UI: [http://localhost:3333/api](http://localhost:3333/api)

## Main features

- JWT authentication with refresh cookies and password reset
- Real-time channel chat over Socket.IO
- Persistent player profiles with level, experience, gold, gems, and free attribute points
- Strength, Agility, Endurance, Wisdom, and Charisma with derived combat properties
- Persistent inventory and equipment with drag-and-drop and double-click controls
- Multiple persistent shops with gold, stock, generated equipment, seeded consumables, and 24-hour restocks
- Item rarity, modifiers, properties, comparison tooltips, buying, and selling
- Fantasy map exploration with land collision and random encounters
- Level-appropriate monster generation, combat resolution, rewards, and combat logs
- English and Russian UI localization

## Project structure

```text
fairy-world/
├── back/                  NestJS API
│   ├── prisma/            Prisma schema, migrations, and seed data
│   └── src/               API modules and domain services
├── front/                 Quasar/Vue single-page application
│   ├── public/            Static assets and item icons
│   ├── src/modules/       Feature modules
│   └── test/              Vitest tests
├── docker-compose.yml     Development containers and Mailpit
└── Makefile               Common development commands
```

## Development commands

Run Make targets from the repository root:

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `make install`    | Install frontend and backend dependencies |
| `make dev-front`  | Start the frontend development server     |
| `make dev-back`   | Start the backend in watch mode           |
| `make lint`       | Lint both applications                    |
| `make lint-front` | Lint only the frontend                    |
| `make lint-back`  | Lint only the backend                     |
| `make test`       | Run frontend and backend tests            |
| `make test-front` | Run Vitest                                |
| `make test-back`  | Run Jest                                  |
| `make tsc-check`  | Type-check both applications              |

Build each application with:

```bash
cd front && npm run build
cd ../back && npm run build
```

## API overview

All REST endpoints use the `/api/v1` prefix. The main endpoint groups are:

- `/auth` — registration, login, token refresh, and logout
- `/passwords` — password-reset requests and completion
- `/users/me` — current profile, attributes, inventory, and equipped items
- `/users/me/attributes` — allocate free attribute points
- `/users/me/equipment` — equip and unequip inventory items
- `/shop/:shopId` — shop state, buying, selling, and gem-funded refreshes
- `/locations` — map locations and the current player location
- `/monsters` — monster data, encounters, battles, and retreating
- `/chat` — channels and messages

Use Swagger UI for the current request and response schemas.

## Quality checks

### Player progression

Low-level ratings use denominator floors: crit/dodge chance is `min(50, rating × 65 / max(level, 35))`. Critical damage starts at 150%: with `effective = rating × 15 / max(level, 70)`, its percentage is `150 + 150 × effective / (effective + 6)`, capped at 300%. Defense uses `max(level, 7)` and is capped at 50%. With the five starting attributes and no gear/buffs this gives 4.6% crit, 4.6% dodge, 6.7% defense, and 172.7% critical damage. Level-100 values are unchanged.

Markets are accessible only within 70 map units of their town, including all read, buy, sell, and refresh endpoints. Town IDs are defined in `back/src/locations/towns.ts`. Each player/town pair has its own gold, stock, and restock timer. Stock is generated for the player's level on the first visit, level change, daily refresh, or paid refresh; navigating to Profile and back preserves it. API shop IDs remain town IDs, not private stock IDs. Duplicate backpack stacks are grouped in the shop UI and batch sales consume all matching rows atomically.

Dungeon entries have a database-backed cooldown of one hour per player per dungeon, starting on entry (retreats and defeats count). Guardians are generated around player level +2, then receive 2× health, 1.5× damage, and +5 defense percentage points. They award 3× gold and XP. Dungeon loot odds: 20% no drop, 12% common, 25% magic, 40% rare, 3% unique.

Travel has a 20% encounter chance per step. Travel victory loot odds are 80% no drop, 13.5% common, 4.5% magic, 1.5% rare, and 0.5% unique. Death triggers a red notification, returns the player to Evercross and removes all active buffs; sanctuary cooldowns remain intact. Players above level 10 have a 20% chance to receive a 4-hour death curse (1/2 to 1/3 of a sanctuary blessing: -4 defense rating, -2 damage, or -8% XP). Icevault in the north and Ravencrypt in the northwest use the same dungeon rules.

An active dungeon cooldown can be reset at its entrance for 10 gems, outside an active battle. Normal monsters generate at player level through player level +2, with attributes scaling with level. Shops and loot share the same item generator; magic, rare, and unique equipment always has an attribute affix. New affix rolls use reduced values; existing owned equipment is preserved. Shields can only be equipped and compared in the right hand. Two-handed swords deal substantially higher base damage (7 vs 3 for one-handed swords), must be equipped in the left hand, and require both hands: equipping a two-handed sword moves any equipped off-hand item to the backpack, and equipping an off-hand item unequips the two-handed sword. Daggers provide inherent critical hit and dodge rating, while axes trade versatility for heavier one-handed damage.

Sanctuaries are predefined database records. Requests send the sanctuary ID and coordinates; the server checks both submitted and saved player positions and selects the effect from the database. Starglen grants +10 defense rating, Dawnshrine grants +20% XP, and northern Sunspire grants +5 attack, each for four hours. An active effect of the same type is neither stacked nor extended.

Every level after the first adds 10 maximum HP and 5 maximum mana, derived from level in the shared profile/combat calculation. A confirmed level increase triggers a frontend notification.

The gem store is at `/gems`. In development, its free-claim button grants 100 gems through an authenticated endpoint. The endpoint permits `NODE_ENV=development` or the `start:dev` npm lifecycle, and always rejects `NODE_ENV=production`. Production PayPal/USD checkout is not implemented or enabled; merchant credentials and pack prices are still needed.

The experience map is defined in `back/src/users/level-progression.ts`: advancing from level L requires `100 × L²` XP. Victory rewards include active XP bonuses. Reaching the threshold advances one level, adds 5 free attribute points, and resets XP to zero (excess XP is discarded). Level 100 is the maximum; XP is cleared on subsequent rewards at the cap. `/users/me` includes `experienceToNextLevel` (`null` at level 100) and `maxLevel`.

Equipping requires `item level <= player level + 3 × 1.1`, allowing integer item levels up to three above the player's level. The server enforces this for every equip request, and item responses include `requiredPlayerLevel` for tooltips. Existing equipped items are not automatically removed.

### Item catalog maintenance

Generated equipment reuses the oldest item with the same equipment type, attributes, and stat values. Names, icons, rarity, price, and level do not create a new record when the bonuses match. Potions and scrolls also match by name so distinct consumable effects remain separate.

To check or merge older duplicate records:

```bash
cd back
npx ts-node scripts/deduplicate-items.ts         # preview only
npx ts-node scripts/deduplicate-items.ts --apply # merge in one transaction
```

The merge preserves inventory row IDs, quantities, and equipped slots, combines shop quantities, and saves a recovery snapshot in `back/backups/` before removing duplicate catalog records. Backups are excluded from Git.

### Quests and activity statistics

Cities and villages offer a quest board instead of rumors. Players can accept a quest or choose “Not now”; declined offers remain available later. `/quests` shows current progress and finished quests, and is linked from the side menu.

Each player has a private board per town, refreshed every 24 hours: cities offer three contracts and villages two. One offer is a delivery to a different town, rewarding 50 gold and 100 XP without item drops; the remaining offers are hunts requiring 8–20 kills and rewarding 10 gold and 20 XP per target with a 10% chance of a Magic-or-better item. To deliver, travel to the named destination and press “Deliver message” on `/quests`; `POST /api/v1/quests/:id/deliver` validates the saved position and grants rewards once. Players may hold at most five active quests. `POST /api/v1/quests/refresh` refreshes the current town's board for 30 gems without changing accepted quests. Nearby hunting grounds are favored and offers remain stable across reloads. Accepted contracts do not expire when the board refreshes. `GET /api/v1/quests` returns the journal, available offers, and refresh timer when the player is in town. `POST /api/v1/quests/:id/accept` validates the saved town and offer expiry; repeated acceptance never resets an active quest. `POST /api/v1/quests/:id/cancel` cancels an optional active quest from anywhere. Reaccepting a canceled, still-available offer resets its progress. Primary and finished quests cannot be canceled.

Travel encounters use the saved player coordinates to choose the nearest hunting region from `back/src/monsters/monster-habitats.ts`. Each region has two equally likely species (for example, Dire Wolves and Forest Trolls in Whisperwood near Westmere). Quests describe the region, nearby landmark, and coordinates. All ranks count; accepting a quest does not change encounter odds. Dungeon generators retain their independent monster pool. Only victories in battles started after acceptance count, including dungeon monsters of the matching type. Completion and all rewards are saved atomically with battle rewards, and the player receives a completion notification.

Each sanctuary grants a blessing at most once per player every four hours. Its database cooldown is independent of the buff, so replacing a buff cannot reset the timer. `/api/v1/users/me` exposes `sanctuaryCooldowns`, `killedMonsters`, and `accomplishedQuests`; the profile Statistics block shows both counts. Kill tracking starts with this migration because historical battles were not persisted.

### Lint, types, and tests

Before opening a pull request, run:

```bash
make lint
make tsc-check
make test
```

The `project-check` GitHub Actions workflow runs installation, linting, tests, and TypeScript checks on every push.
