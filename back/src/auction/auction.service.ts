import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuctionStatus, NotificationKind, Prisma, type AuctionListing, type Item } from '../../generated/client';
import { ItemView } from '../common/views/item.view';
import { getPotionRequiredLevel } from '../items/potion-effects';
import { PrismaService } from '../prisma.service';
import { requiredPlayerLevel } from '../users/level-progression';
import { CRAFT_ITEMS, CRAFTING_MIN_LEVEL, upgradeValueForLevel } from '../crafting/crafting.catalog';
import { AuctionQueryDto, CreateAuctionDto } from './auction.dto';
import { townAt } from '../locations/towns';

export const AUCTION_RETURN_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 24;
const MAX_GOLD = 2_147_483_647;
const itemInclude = { attributes: { include: { attribute: true } }, stats: { include: { stat: true } } } as const;
const listingInclude = {
  item: { include: itemInclude },
  seller: { select: { user: { select: { name: true } } } },
} as const;
type ListingViewSource = Prisma.AuctionListingGetPayload<{ include: typeof listingInclude }>;

function auctionRequiredLevel(item: Pick<Item, 'equipmentType' | 'isConsumable' | 'name' | 'level'>) {
  if (item.equipmentType.includes('RECIPE')) return CRAFTING_MIN_LEVEL;
  return item.isConsumable ? Math.max(getPotionRequiredLevel(item.name), item.level) : requiredPlayerLevel(item.level);
}

@Injectable()
export class AuctionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionService.name);
  constructor(private readonly prisma: PrismaService) {}

  // All inventory, escrow and gold changes commit together. Retrying also handles simultaneous slot/stack creation.
  private async atomic<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code) &&
          attempt < 3
        )
          continue;
        throw error;
      }
    }
  }

  private async profile(tx: Prisma.TransactionClient, userId: number) {
    const profile = await tx.gameProfile.findUnique({
      where: { userId },
      select: { id: true, level: true, gold: true, mapPositionX: true, mapPositionY: true },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    return profile;
  }

  private requireTown(profile: { mapPositionX: number; mapPositionY: number }) {
    if (!townAt(profile)) throw new BadRequestException('Visit a town to use the auction house');
  }

  private view(listing: ListingViewSource, profileId: number) {
    const { seller, item, ...details } = listing;
    const catalyst = CRAFT_ITEMS.find((entry) => entry.kind === 'UPGRADE' && entry.name === item.name);
    return {
      ...details,
      sellerName: seller.user.name,
      isMine: listing.sellerId === profileId,
      item: { ...ItemView.render(item), requiredPlayerLevel: auctionRequiredLevel(item) },
      ...(catalyst?.upgradeType
        ? {
            craftUpgradeType: catalyst.upgradeType,
            craftUpgradeValue: listing.upgradeValue ?? upgradeValueForLevel(catalyst.upgradeType, item.level),
          }
        : {}),
    };
  }

  async list(userId: number, query: AuctionQueryDto) {
    const profile = await this.profile(this.prisma, userId);
    this.requireTown(profile);
    const now = new Date();
    const where: Prisma.AuctionListingWhereInput =
      query.view === 'mine' ? { sellerId: profile.id } : { status: AuctionStatus.ACTIVE, expiresAt: { gt: now } };
    const [listings, total] = await this.prisma.$transaction([
      this.prisma.auctionListing.findMany({
        where,
        include: listingInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PAGE_SIZE,
        skip: (query.page - 1) * PAGE_SIZE,
      }),
      this.prisma.auctionListing.count({ where }),
    ]);
    return {
      listings: listings.map((entry) => this.view(entry, profile.id)),
      total,
      page: query.page,
      pageSize: PAGE_SIZE,
      serverTime: now,
    };
  }

  async create(userId: number, dto: CreateAuctionDto) {
    if (
      !Number.isSafeInteger(dto.price) ||
      dto.price < 1 ||
      dto.price > 1_000_000_000 ||
      !Number.isInteger(dto.durationHours) ||
      dto.durationHours < 1 ||
      dto.durationHours > 24 ||
      !Number.isInteger(dto.quantity) ||
      dto.quantity < 1 ||
      dto.quantity > 99999
    ) {
      throw new BadRequestException('Choose a positive gold price, a valid quantity and a duration of 1–24 hours');
    }
    return this.atomic(async (tx) => {
      const profile = await this.profile(tx, userId);
      this.requireTown(profile);
      const previous = await tx.auctionListing.findUnique({ where: { id: dto.requestId } });
      if (previous) {
        if (previous.sellerId !== profile.id) throw new BadRequestException('Listing request already used');
        return { success: true, listingId: previous.id };
      }
      const entry = await tx.inventoryItem.findFirst({
        where: { id: dto.inventoryItemId, gameProfileId: profile.id, isEquiped: false },
        include: { item: true },
      });
      if (!entry) throw new BadRequestException('Choose an unequipped item from your inventory');
      if (entry.quantity < dto.quantity) throw new BadRequestException('Not enough items in this stack');
      if (entry.item.rarity === 'QUEST') throw new BadRequestException('Quest items cannot be sold');
      const now = new Date();
      const active = await tx.auctionListing.count({
        where: { sellerId: profile.id, status: AuctionStatus.ACTIVE, expiresAt: { gt: now } },
      });
      if (active >= 24) throw new BadRequestException('You can have at most 24 active listings');
      await tx.auctionListing.create({
        data: {
          id: dto.requestId,
          sellerId: profile.id,
          itemId: entry.itemId,
          quantity: dto.quantity,
          price: dto.price,
          upgradeType: entry.upgradeType,
          upgradeValue: entry.upgradeValue,
          expiresAt: new Date(now.getTime() + dto.durationHours * 60 * 60 * 1000),
        },
      });
      if (entry.quantity === dto.quantity) await tx.inventoryItem.delete({ where: { id: entry.id } });
      else await tx.inventoryItem.update({ where: { id: entry.id }, data: { quantity: { decrement: dto.quantity } } });
      return { success: true, listingId: dto.requestId };
    });
  }

  /** Merge only identical upgrades; a full bag may still accept an existing compatible stack. */
  private async deliver(tx: Prisma.TransactionClient, profileId: number, listing: AuctionListing) {
    const stack = await tx.inventoryItem.findFirst({
      where: {
        gameProfileId: profileId,
        itemId: listing.itemId,
        isEquiped: false,
        upgradeType: listing.upgradeType,
        upgradeValue: listing.upgradeValue,
      },
    });
    if (stack) {
      if (stack.quantity > MAX_GOLD - listing.quantity) return false;
      await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: listing.quantity } } });
    } else {
      if ((await tx.inventoryItem.count({ where: { gameProfileId: profileId, isEquiped: false } })) >= 24) return false;
      await tx.inventoryItem.create({
        data: {
          gameProfileId: profileId,
          itemId: listing.itemId,
          quantity: listing.quantity,
          upgradeType: listing.upgradeType,
          upgradeValue: listing.upgradeValue,
          isEquiped: false,
          slot: null,
        },
      });
    }
    return true;
  }

  async buy(userId: number, id: string) {
    return this.atomic(async (tx) => {
      const buyer = await this.profile(tx, userId);
      this.requireTown(buyer);
      const listing = await tx.auctionListing.findUnique({ where: { id }, include: { item: true } });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.status === AuctionStatus.SOLD && listing.buyerId === buyer.id) return { success: true };
      if (listing.sellerId === buyer.id) throw new BadRequestException('You cannot buy your own listing');
      const now = new Date();
      if (listing.status !== AuctionStatus.ACTIVE || listing.expiresAt <= now)
        throw new BadRequestException('This listing has sold or expired');
      const required = auctionRequiredLevel(listing.item);
      if (buyer.level < required) throw new BadRequestException(`This item requires player level ${required}`);
      if (buyer.gold < listing.price) throw new BadRequestException('Not enough gold');
      if (!(await this.deliver(tx, buyer.id, listing)))
        throw new BadRequestException('Make room in your inventory before buying (24 slots maximum)');
      const charged = await tx.gameProfile.updateMany({
        where: { id: buyer.id, gold: { gte: listing.price } },
        data: { gold: { decrement: listing.price } },
      });
      if (charged.count !== 1) throw new BadRequestException('Not enough gold');
      const credited = await tx.gameProfile.updateMany({
        where: { id: listing.sellerId, gold: { lte: MAX_GOLD - listing.price } },
        data: { gold: { increment: listing.price } },
      });
      if (credited.count !== 1) throw new BadRequestException('The seller cannot receive more gold');
      await tx.auctionListing.update({
        where: { id },
        data: { status: AuctionStatus.SOLD, buyerId: buyer.id, completedAt: now },
      });
      await tx.playerNotification.createMany({
        data: [
          { gameProfileId: listing.sellerId, listingId: id, kind: NotificationKind.AUCTION_SOLD },
          { gameProfileId: buyer.id, listingId: id, kind: NotificationKind.AUCTION_BOUGHT },
        ],
      });
      return { success: true };
    });
  }

  async expireListing(id: string) {
    return this.atomic(async (tx) => {
      const listing = await tx.auctionListing.findUnique({ where: { id } });
      const now = new Date();
      if (!listing || listing.status !== AuctionStatus.ACTIVE || listing.expiresAt > now) return;
      const returned = await this.deliver(tx, listing.sellerId, listing);
      // The claim window starts at expiry, not when an offline player next logs in.
      const claimExpiresAt = new Date(listing.expiresAt.getTime() + AUCTION_RETURN_MS);
      const forfeited = !returned && claimExpiresAt <= now;
      await tx.auctionListing.update({
        where: { id },
        data: {
          status: returned
            ? AuctionStatus.RETURNED
            : forfeited
              ? AuctionStatus.FORFEITED
              : AuctionStatus.RETURN_PENDING,
          completedAt: now,
          claimExpiresAt: returned ? null : claimExpiresAt,
        },
      });
      await tx.playerNotification.create({
        data: {
          gameProfileId: listing.sellerId,
          listingId: id,
          kind: returned
            ? NotificationKind.AUCTION_RETURNED
            : forfeited
              ? NotificationKind.AUCTION_RETURN_EXPIRED
              : NotificationKind.AUCTION_RETURN_PENDING,
        },
      });
    });
  }

  async claim(userId: number, notificationId: string) {
    return this.atomic(async (tx) => {
      const profile = await this.profile(tx, userId);
      const notification = await tx.playerNotification.findFirst({
        where: { id: notificationId, gameProfileId: profile.id },
        include: { listing: true },
      });
      if (!notification) throw new NotFoundException('Notification not found');
      const listing = notification.listing;
      const now = new Date();
      if (
        listing.sellerId !== profile.id ||
        listing.status !== AuctionStatus.RETURN_PENDING ||
        !listing.claimExpiresAt ||
        listing.claimExpiresAt <= now
      ) {
        throw new BadRequestException('This item is no longer available to claim');
      }
      if (!(await this.deliver(tx, profile.id, listing)))
        throw new BadRequestException('Your inventory is full. Free a slot and try again before the deadline');
      await tx.auctionListing.update({
        where: { id: listing.id },
        data: { status: AuctionStatus.RETURNED, completedAt: now },
      });
      await tx.playerNotification.update({
        where: { id: notificationId },
        data: { kind: NotificationKind.AUCTION_RETURNED, readAt: now },
      });
      return { success: true };
    });
  }

  async notifications(userId: number, page: number) {
    const profile = await this.profile(this.prisma, userId);
    const where = { gameProfileId: profile.id };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.playerNotification.findMany({
        where,
        include: { listing: { include: listingInclude } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.playerNotification.count({ where }),
    ]);
    return {
      notifications: entries.map(({ listing, ...entry }) => ({ ...entry, listing: this.view(listing, profile.id) })),
      total,
      page,
      pageSize: PAGE_SIZE,
      serverTime: new Date(),
    };
  }

  async summary(userId: number) {
    const profile = await this.profile(this.prisma, userId);
    const now = new Date();
    const [unread, pending] = await Promise.all([
      this.prisma.playerNotification.count({ where: { gameProfileId: profile.id, readAt: null } }),
      this.prisma.auctionListing.count({
        where: { sellerId: profile.id, status: AuctionStatus.RETURN_PENDING, claimExpiresAt: { gt: now } },
      }),
    ]);
    return { unread, pending };
  }

  async markRead(userId: number, id: string) {
    await this.prisma.playerNotification.updateMany({
      where: { id, gameProfile: { userId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  @Cron('0 * * * * *', { name: 'auction-expiration', timeZone: 'UTC', waitForCompletion: true })
  async expireAuctions() {
    const now = new Date();
    const expired = await this.prisma.auctionListing.findMany({
      where: { status: AuctionStatus.ACTIVE, expiresAt: { lte: now } },
      orderBy: { expiresAt: 'asc' },
      take: 100,
      select: { id: true },
    });
    for (const listing of expired) {
      try {
        await this.expireListing(listing.id);
      } catch (error) {
        this.logger.error(`Could not return auction ${listing.id}`, error instanceof Error ? error.stack : undefined);
      }
    }
    await this.atomic(async (tx) => {
      const due = { status: AuctionStatus.RETURN_PENDING, claimExpiresAt: { lte: now } };
      await tx.playerNotification.updateMany({
        where: { listing: due, kind: NotificationKind.AUCTION_RETURN_PENDING },
        data: { kind: NotificationKind.AUCTION_RETURN_EXPIRED, readAt: null },
      });
      await tx.auctionListing.updateMany({ where: due, data: { status: AuctionStatus.FORFEITED, completedAt: now } });
    });
  }

  async onApplicationBootstrap() {
    await this.expireAuctions();
  }
}
