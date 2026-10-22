CREATE TYPE "AuctionStatus" AS ENUM ('ACTIVE', 'SOLD', 'RETURNED', 'RETURN_PENDING', 'FORFEITED');
CREATE TYPE "NotificationKind" AS ENUM ('AUCTION_SOLD', 'AUCTION_BOUGHT', 'AUCTION_RETURNED', 'AUCTION_RETURN_PENDING', 'AUCTION_RETURN_EXPIRED');

CREATE TABLE "AuctionListing" (
  "id" TEXT NOT NULL,
  "sellerId" INTEGER NOT NULL,
  "buyerId" INTEGER,
  "itemId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "price" INTEGER NOT NULL CHECK ("price" > 0),
  "upgradeType" "CraftUpgradeType",
  "upgradeValue" DOUBLE PRECISION,
  "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "claimExpiresAt" TIMESTAMP(3),
  CONSTRAINT "AuctionListing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuctionListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "GameProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AuctionListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AuctionListing_status_expiresAt_idx" ON "AuctionListing"("status", "expiresAt");
CREATE INDEX "AuctionListing_status_claimExpiresAt_idx" ON "AuctionListing"("status", "claimExpiresAt");
CREATE INDEX "AuctionListing_sellerId_createdAt_idx" ON "AuctionListing"("sellerId", "createdAt");

CREATE TABLE "PlayerNotification" (
  "id" TEXT NOT NULL,
  "gameProfileId" INTEGER NOT NULL,
  "listingId" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "PlayerNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlayerNotification_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerNotification_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AuctionListing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlayerNotification_gameProfileId_listingId_key" ON "PlayerNotification"("gameProfileId", "listingId");
CREATE INDEX "PlayerNotification_gameProfileId_readAt_createdAt_idx" ON "PlayerNotification"("gameProfileId", "readAt", "createdAt");
