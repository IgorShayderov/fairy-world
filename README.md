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
