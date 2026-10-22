import type { InventoryEntry, CraftUpgradeType } from '@/modules/Inventory/types';

import routes from '@/routes';
import { api } from '@shared/api';

export type AuctionStatus = 'ACTIVE' | 'SOLD' | 'RETURNED' | 'RETURN_PENDING' | 'FORFEITED';
export interface AuctionListing {
  id: string;
  sellerName: string;
  isMine: boolean;
  item: InventoryEntry['item'];
  quantity: number;
  price: number;
  upgradeType: CraftUpgradeType | null;
  upgradeValue: number | null;
  craftUpgradeType?: CraftUpgradeType;
  craftUpgradeValue?: number;
  status: AuctionStatus;
  expiresAt: string;
  claimExpiresAt: string | null;
  createdAt: string;
}
export interface ListingPage {
  listings: AuctionListing[];
  total: number;
  page: number;
  pageSize: number;
  serverTime: string;
}
export interface AuctionNotification {
  id: string;
  kind: 'AUCTION_SOLD' | 'AUCTION_BOUGHT' | 'AUCTION_RETURNED' | 'AUCTION_RETURN_PENDING' | 'AUCTION_RETURN_EXPIRED';
  createdAt: string;
  readAt: string | null;
  listing: AuctionListing;
}
export interface NotificationPage {
  notifications: AuctionNotification[];
  total: number;
  page: number;
  pageSize: number;
  serverTime: string;
}
export interface CreateListing {
  requestId: string;
  inventoryItemId: number;
  quantity: number;
  price: number;
  durationHours: number;
}

export const auctionApi = {
  async list(page = 1, view: 'market' | 'mine' = 'market') {
    return (await api.get<ListingPage>(`${routes.api.auction.path()}?page=${page}&view=${view}`)).data;
  },
  async create(input: CreateListing) {
    return (await api.post<{ success: boolean; listingId: string }>(routes.api.auction.path(), input)).data;
  },
  async buy(id: string) {
    await api.post(routes.api.auction.buyPath(id));
  },
  async notifications(page = 1) {
    return (await api.get<NotificationPage>(`${routes.api.auction.notificationsPath()}?page=${page}`)).data;
  },
  async summary() {
    return (await api.get<{ unread: number; pending: number }>(routes.api.auction.summaryPath())).data;
  },
  async claim(id: string) {
    await api.post(routes.api.auction.claimPath(id));
  },
  async read(id: string) {
    await api.post(routes.api.auction.readPath(id));
  },
};

export function timeLeft(deadline: string, now: number) {
  const minutes = Math.ceil(Math.max(0, Date.parse(deadline) - now) / 60000);
  if (!minutes) return 'Expired';
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}
export function purchaseBlock(listing: AuctionListing, level: number, gold: number, now: number) {
  if (listing.isMine) return 'Your listing';
  if (listing.status !== 'ACTIVE' || Date.parse(listing.expiresAt) <= now) return 'Listing ended';
  if (level < (listing.item.requiredPlayerLevel ?? 1)) return `Requires level ${listing.item.requiredPlayerLevel}`;
  if (gold < listing.price) return 'Not enough gold';
  return null;
}
