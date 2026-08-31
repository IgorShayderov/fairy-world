# fairy-world

Simple RPG game built as a monorepo.

## Stack

- **Back**: NestJS + Prisma 7 + PostgreSQL
- **Front**: Quasar (Vue 3) + Tailwind
- **CI**: GitHub Actions via `Makefile` targets (`make install`, `make lint`, `make test`)

## Requirements

- Node v22
- Docker + docker-compose (PostgreSQL)

## Setup

```bash
# 1. Start supporting services (front, back, mailpit)
docker-compose up -d

# 2. Install deps for both apps
make install          # or: cd front && npm i && cd ../back && npm i

# 3. Configure DB connection (env) & apply migrations
cd back
echo 'DATABASE_URL="postgresql://USER:PASS@localhost:5432/fairy_world"' > .env
npx prisma generate
npx prisma db push    # or: npx prisma migrate deploy

# 4. Run dev (two terminals)
make front-dev        # front on http://localhost:9000
make back-dev         # back on http://localhost:3011
```

Make targets (`Makefile`):

| Target          | Description                |
| --------------- | -------------------------- |
| `install`       | Install front + back deps  |
| `lint-front`    | Lint frontend              |
| `lint-back`     | Lint backend               |
| `front-dev`     | Run frontend (dev)         |
| `back-dev`      | Run backend (dev)          |
| `test`          | Run backend unit tests     |

## Scripts

Back (`back/package.json`):

- `npm run lint` — ESLint (back)
- `npm test` — Jest unit tests

Front (`front/package.json`):

- `npm run lint` — ESLint (front)
- `npm run dev` — Quasar dev server (`quasar dev`)
- `npm run build` — Production build (`quasar build`)

## Features / Modules

**Auth** — JWT auth, password reset (DB-persisted tokens, single-use, 15-min expiry).

**Chat** — WebSocket (Socket.io) chat with channels. `Message` is attributed to its author via `authorId`. See `GET/POST /chat/...`.

**Shop** — Buy/sell items. Inventory (`InventoryItem`) tracks `quantity` per user+item, with an `equipped` flag (toggle via `POST /shop/equip`).

**Users** — `GET /users/me` returns the current user.

**Locations** — `Location` (enum `variant`/`eventType`) and `UsersLocation` (1 user → 1 location). `GET /locations` / `GET /locations/me` / `POST /locations/me`.

**Game** — `PlayerClass` manages gold, XP, level, and current location.

## API

All REST endpoints under `/api/v1/` (see `front/src/routes.ts` for the full path list). Auth-guarded routes use `Bearer <access_token>`.

## Testing

```bash
make test          # back unit tests
```

## CI

[![Project status](https://github.com/IgorShayderov/fairy-world/actions/workflows/project-check.yml/badge.svg)](https://github.com/IgorShayderov/fairy-world/actions)

`project-check` runs on every PR: `make install`, `make lint-back`, `make lint-front`, `make test-back`.
