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

Low-level ratings use denominator floors: chance uses `max(level, 50)`, critical damage uses `max(level, 100)`, and defense uses `max(level, 10)`. With the five starting attributes and no gear/buffs this gives 2.5% crit, 2.5% dodge, 4.8% defense, and 135.6% critical damage.

Markets are accessible only within 70 map units of their town, including all read, buy, sell, and refresh endpoints. Town IDs are defined in `back/src/locations/towns.ts`. Each player/town pair has its own gold, stock, and restock timer. Stock is generated for the player's level on the first visit, level change, daily refresh, or paid refresh; navigating to Profile and back preserves it. API shop IDs remain town IDs, not private stock IDs. Duplicate backpack stacks are grouped in the shop UI and batch sales consume all matching rows atomically.

Dungeon entries have a database-backed cooldown of one hour per player per dungeon, starting on entry (retreats and defeats count). Guardians are generated around player level +2, then receive 2× health, 1.5× damage, and +5 defense percentage points. They award 3× gold and XP. Dungeon loot odds: 20% no drop, 40% common, 25% magic, 12% rare, 3% unique.

An active dungeon cooldown can be reset at its entrance for 10 gems, outside an active battle. Normal monsters generate at player level through player level +2, with attributes scaling with level. Shops and loot share the same item generator; magic, rare, and unique equipment always has an attribute affix. New affix rolls use reduced values; existing owned equipment is preserved. Shields can only be equipped and compared in the right hand.

Sanctuaries are predefined database records. Requests send the sanctuary ID and coordinates; the server checks both submitted and saved player positions and selects the effect from the database. Starglen grants +10 defense rating; Dawnshrine grants +20% XP, both for four hours. An active effect of the same type is neither stacked nor extended.

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

### Lint, types, and tests

Before opening a pull request, run:

```bash
make lint
make tsc-check
make test
```

The `project-check` GitHub Actions workflow runs installation, linting, tests, and TypeScript checks on every push.
