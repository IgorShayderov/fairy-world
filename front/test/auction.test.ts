import { describe, expect, it, vi } from 'vitest';
import { auctionApi, purchaseBlock, timeLeft, type AuctionListing } from '../src/modules/Auction/api';
import { api } from '../src/shared/api';

vi.mock('../src/shared/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const now = Date.parse('2026-10-18T12:00:00Z');
const listing = {
  id: 'listing', isMine: false, price: 100, status: 'ACTIVE', expiresAt: '2026-10-18T13:00:00Z',
  item: { requiredPlayerLevel: 10 },
} as AuctionListing;
describe('auction presentation and API', () => {
  it('allows eligible buyers and explains blocked purchases', () => {
    expect(purchaseBlock(listing, 10, 100, now)).toBeNull();
    expect(purchaseBlock(listing, 9, 100, now)).toBe('Requires level 10');
    expect(purchaseBlock(listing, 10, 99, now)).toBe('Not enough gold');
    expect(purchaseBlock({ ...listing, isMine: true }, 20, 999, now)).toBe('Your listing');
    expect(purchaseBlock(listing, 20, 999, Date.parse(listing.expiresAt))).toBe('Listing ended');
    expect(purchaseBlock({ ...listing, status: 'SOLD' }, 20, 999, now)).toBe('Listing ended');
  });
  it('shows useful deadlines without allowing a grace period', () => {
    expect(timeLeft('2026-10-18T13:30:00Z', now)).toBe('1h 30m');
    expect(timeLeft('2026-10-25T12:00:00Z', now)).toBe('7d 0h');
    expect(timeLeft('2026-10-18T12:00:01Z', now)).toBe('1m');
    expect(timeLeft('2026-10-18T12:00:00Z', now)).toBe('Expired');
  });
  it('uses shared listings and owner-scoped notification endpoints', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { listings: [listing] }, meta: {} });
    expect((await auctionApi.list(2, 'mine')).listings).toEqual([listing]);
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/auction?page=2&view=mine'));
    const input = { requestId: 'uuid', inventoryItemId: 7, quantity: 1, price: 100, durationHours: 24 };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, listingId: 'uuid' }, meta: {} });
    await auctionApi.create(input);
    expect(api.post).toHaveBeenCalledWith(expect.stringMatching(/\/auction$/), input);
    await auctionApi.buy('listing');
    expect(api.post).toHaveBeenLastCalledWith(expect.stringMatching(/\/auction\/listing\/buy$/));
    await auctionApi.claim('notification');
    expect(api.post).toHaveBeenLastCalledWith(expect.stringMatching(/\/notifications\/notification\/claim$/));
  });
});
