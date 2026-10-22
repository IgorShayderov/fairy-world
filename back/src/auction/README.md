# Auction house

Fixed-price player trading, available from town options. Shops and auctions are not sidebar entries. Notifications are available everywhere through the header bell and its slide-out drawer (the `/notifications` URL remains supported).

- Browsing, listing and buying require the same server-verified town proximity as shops (within 70 map units of a town, including villages). Direct URLs/API calls cannot bypass this. The market is shared across towns.
- Automatic returns and notification claims do not require the seller to remain in town.

- Authenticated players see the same live market. Personal history and notifications are owner-scoped.
- Sell an unequipped inventory item or stack for a total gold price, lasting 1–24 whole hours.
- No fee. Maximum 24 active listings per seller, 99,999 units per lot and 1,000,000,000 gold per lot.
- Listing creation removes the selected quantity into escrow. Item identity and upgrades are preserved.
- Buyers need the item's existing required player level, enough gold and inventory capacity (or an identical stack). No self-purchases.
- Gold and ownership transfer in one serializable transaction, with bounded conflict retries. Client-generated UUID request IDs make listing retries idempotent; purchases by the same successful buyer do not charge twice.
- Every minute and on startup, expired listings return to the seller. A full backpack produces a claim notification. Seven days after the listing expiry, an unclaimed return becomes unavailable; audit records remain.
- Buying and claiming check deadlines server-side even before the scheduled job runs. Expiry jobs and claims are also transactional and safe across server instances.
- Notifications retain sales, purchases and returns. Marking a return as read does not dismiss the item or its pending badge.

## Deployment

Run from `back` before starting the updated backend:

```sh
npx prisma migrate deploy
npx prisma generate
```

The Nest scheduler must run in at least one backend instance. It handles up to 100 expired listings per minute and catches up after downtime. Active listings are never buyable after their deadline, even during a backlog.

## Verification

```sh
npx jest --runInBand auction/auction.service.spec.ts auction/auction.dto.spec.ts
AUCTION_DB_TEST=1 npx jest --runInBand auction/auction.database.spec.ts
```

The opt-in database suite uses the configured local database with migrated tables. It creates uniquely named temporary users/items and removes only those generated fixture IDs. It exercises competing buyers, duplicate creation, shared listings, full inventories and concurrent return/claim transactions.

Frontend coverage: `front/test/auction.test.ts` and `front/tests/auction.spec.ts`.
