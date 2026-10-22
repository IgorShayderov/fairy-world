# Admin player management

Open `/admin` → **Users** with the separate admin login. Search by name, email, or ID. New accounts are normal USER accounts with level 1, five base attributes, base stats, and starter sword/shield; registration password rules apply. No login token is issued for the created player.

Editable fields: name, email, level (1–100), current-level XP, gold, gems, coins of honour, unspent attribute points, and the five base attributes. XP must stay below the next level threshold (zero at level 100). Level changes update skill point entitlement automatically but do not silently redistribute attribute points. Lowering a level is rejected if existing equipment or learned skills would become invalid. Role/password administration and account deletion are intentionally not exposed.

Inventory: search existing item definitions, grant to backpack, change quantities, unequip, or remove a stack. Operations target owned inventory entry IDs, never globally edit/delete an item definition. Equipped stacks remain quantity 1, upgrades are preserved on unequip/quantity edits, and the 24-slot backpack limit applies. Auction escrow and crafting-material storage are not edited by this screen.

Every mutation requires a reason and the latest `stateToken`. Serializable transactions reject competing writes/stale saves and commit the mutation and before/after audit record together. Active battles and dungeon parties block edits. Credentials are not selected into responses or audit snapshots. Changing an email invalidates existing password-reset tokens and refresh tokens.

Deploy migration `20261022000000_admin_user_management` before using these controls. All `/api/v1/admin/users` routes require `AdminAuthGuard`; game JWTs, including ADMIN-role game JWTs, cannot access them.

Verification: `ADMIN_USERS_DB_TEST=1 npx jest src/admin-users/admin-users.database.spec.ts --runInBand` runs HTTP/database tests using disposable, uniquely named users/items, then cleans up only those records. No existing player is edited.
