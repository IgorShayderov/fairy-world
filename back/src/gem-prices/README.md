# Premium, timer and refresh gem prices

Sign in at `/admin` with a separate admin session and open **Gem prices**. Each action has an independent price and Save button. Prices persist in `GemActionPrice` and are read for each purchase; no server restart is needed.

| Action                      | Default gems |
| --------------------------- | -----------: |
| Premium account (30 days)   |          200 |
| Shop stock refresh          |           10 |
| Town quest refresh          |           30 |
| PvP opponent refresh        |           30 |
| PvP attack cooldown skip    |           10 |
| Dungeon entry cooldown skip |           10 |

Allowed prices are whole numbers from 0 to 100,000. Zero makes the action free. Unconfigured actions use the defaults above. Premium purchases and renewals use the same configured price and always grant 30 days; existing memberships are unchanged. Skill reset prices are unchanged.

Deploy the `20261021000000_gem_action_prices` and `20261021010000_premium_gem_price` Prisma migrations before running the updated application. They do not change existing balances or create price overrides.

`GET/POST /api/v1/admin/gem-prices` requires the independent admin token. Game clients can read `GET /api/v1/game/gem-prices` with their normal token, but cannot edit prices. Current clients send `expectedCost` when buying a skip/refresh. If the price changed since it was displayed, the server returns 409 before charging; the UI reloads the current price for the next confirmation.
