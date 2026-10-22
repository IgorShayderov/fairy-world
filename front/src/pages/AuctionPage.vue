<template>
  <main class="auction-page">
    <div class="auction-wrap">
      <header class="auction-header">
        <div>
          <p class="auction-kicker">Player marketplace</p>
          <h1><QIcon name="gavel" /> Auction house</h1>
          <p class="auction-muted">Trade with every adventurer. Fixed gold prices, no bidding or fees.</p>
        </div>
        <div class="auction-balance">{{ (user.user?.gold ?? 0).toLocaleString() }} gold</div>
      </header>
      <div v-if="!inTown" class="auction-card">
        <p>{{ loading ? 'Checking town access…' : 'Visit a town to use the auction house.' }}</p>
        <RouterLink :to="routes.rootPath()" class="auction-button mt-4">Return to map</RouterLink>
      </div>
      <template v-else>
        <nav class="auction-tabs" aria-label="Auction views">
          <button
            v-for="option in tabs"
            :key="option.id"
            class="auction-button"
            :aria-selected="tab === option.id"
            @click="switchTab(option.id)"
          >
            {{ option.label }}
          </button>
          <RouterLink :to="routes.notificationsPath()" class="auction-button"
            ><QIcon name="notifications_none" /> Notifications</RouterLink
          >
        </nav>
        <div v-if="error" role="alert" class="auction-error">
          {{ error }} <button class="underline" @click="refresh">Retry</button>
        </div>
        <div v-if="notice" role="status" class="auction-notice">{{ notice }}</div>
        <template v-if="tab === 'sell'">
          <form class="auction-card auction-sell" @submit.prevent="submitListing">
            <h2 class="text-xl text-[#f3dfaa]">List an item</h2>
            <p class="auction-muted">
              Only unequipped items can be listed. The item leaves your backpack until it sells or expires. Up to 24
              active listings.
            </p>
            <div class="auction-form">
              <label class="col-span-full"
                >Inventory item
                <select v-model.number="selectedId" required aria-label="Inventory item">
                  <option :value="0" disabled>Choose an item</option>
                  <option v-for="entry in sellable" :key="entry.id" :value="entry.id">
                    {{ entry.item.name }} · {{ entry.item.rarity }} · level {{ entry.item.level }} · ×{{ entry.quantity
                    }}{{ entry.upgradeType ? ` · +${entry.upgradeValue} ${entry.upgradeType}` : '' }}
                  </option>
                </select>
              </label>
              <label
                >Quantity<input
                  v-model.number="quantity"
                  type="number"
                  min="1"
                  :max="selected?.quantity ?? 1"
                  step="1"
                  required
              /></label>
              <label
                >Total price (gold)<input
                  v-model.number="price"
                  type="number"
                  min="1"
                  max="1000000000"
                  step="1"
                  required
              /></label>
              <label
                >Listing duration<select v-model.number="durationHours">
                  <option v-for="hours in 24" :key="hours" :value="hours">
                    {{ hours }} {{ hours === 1 ? 'hour' : 'hours' }}
                  </option>
                </select></label
              >
            </div>
            <AuctionItem v-if="selected" :entry="selected" />
            <p class="auction-warning">
              Unsold items return automatically. If your backpack is full, claim the item from Notifications within 7
              days of expiry. Unclaimed items are lost after the deadline.
            </p>
            <p v-if="!sellable.length" class="auction-muted">
              No sellable items in your backpack. Equipped items and quest items cannot be listed.
            </p>
            <button class="auction-button auction-button--gold" :disabled="busy || !selected">
              {{ busy ? 'Listing…' : 'List item' }}
            </button>
          </form>
        </template>
        <template v-else>
          <p v-if="loading" role="status">Loading auction…</p>
          <p v-else-if="!listings?.listings.length" class="auction-empty">
            {{
              tab === 'mine' ? 'You have no listings yet.' : 'The auction house is quiet. Be the first to list an item.'
            }}
          </p>
          <div v-else class="auction-grid">
            <article v-for="listing in listings.listings" :key="listing.id" class="auction-card">
              <AuctionItem :entry="listing" />
              <div class="auction-meta">
                <span class="auction-muted">Seller: {{ listing.sellerName }}</span
                ><span :class="listing.status === 'ACTIVE' ? 'auction-muted' : 'auction-upgrade'">{{
                  statusText(listing)
                }}</span>
              </div>
              <footer>
                <span class="auction-price"
                  >{{ listing.price.toLocaleString() }} gold<span
                    v-if="listing.quantity > 1"
                    class="block text-xs font-normal"
                    >Total for ×{{ listing.quantity }}</span
                  ></span
                >
                <button
                  v-if="tab === 'market'"
                  class="auction-button auction-button--gold"
                  :disabled="busy || !!blocked(listing)"
                  @click="confirmListing = listing"
                >
                  {{ blocked(listing) ?? 'Buy item' }}
                </button>
                <RouterLink
                  v-else-if="listing.status === 'RETURN_PENDING'"
                  :to="routes.notificationsPath()"
                  class="auction-button"
                  >Claim in notifications</RouterLink
                >
              </footer>
            </article>
          </div>
          <div v-if="listings && listings.total > listings.pageSize" class="auction-pagination">
            <button class="auction-button" :disabled="page <= 1 || loading" @click="page--">Previous</button
            ><span>Page {{ page }} / {{ Math.ceil(listings.total / listings.pageSize) }}</span
            ><button
              class="auction-button"
              :disabled="page * listings.pageSize >= listings.total || loading"
              @click="page++"
            >
              Next
            </button>
          </div>
        </template>
      </template>
    </div>
    <QDialog
      :model-value="!!confirmListing"
      :persistent="busy"
      @update:model-value="
        (value) => {
          if (!value) confirmListing = null;
        }
      "
    >
      <div v-if="confirmListing" class="auction-dialog">
        <h2>Confirm purchase</h2>
        <AuctionItem :entry="confirmListing" />
        <p class="mt-4">
          Pay <strong>{{ confirmListing.price.toLocaleString() }} gold</strong> for this listing?
        </p>
        <p class="auction-muted mt-2">
          The item will be added to your backpack. You need a free slot or a matching stack.
        </p>
        <div class="auction-dialog-actions">
          <button class="auction-button" :disabled="busy" @click="confirmListing = null">Cancel</button
          ><button
            class="auction-button auction-button--gold"
            :disabled="busy || !!blocked(confirmListing)"
            @click="buy"
          >
            {{ busy ? 'Buying…' : 'Confirm purchase' }}
          </button>
        </div>
      </div>
    </QDialog>
  </main>
</template>
<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { QDialog, QIcon } from 'quasar';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { auctionApi, purchaseBlock, timeLeft, type AuctionListing, type ListingPage } from '@/modules/Auction/api';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import routes from '@/routes';

import AuctionItem from '@/modules/Auction/AuctionItem.vue';
import '@/modules/Auction/auction.css';

const user = useCurrentUserStore();
const inTown = computed(() => !!user.user?.currentShopId);
const queries = useQueryClient();
type Tab = 'market' | 'mine' | 'sell';
const tabs = [
  { id: 'market' as const, label: 'All listings' },
  { id: 'mine' as const, label: 'My listings' },
  { id: 'sell' as const, label: 'Sell an item' },
];
const tab = ref<Tab>('market');
const page = ref(1),
  loading = ref(true),
  busy = ref(false),
  error = ref(''),
  notice = ref('');
const listings = ref<ListingPage>();
const confirmListing = ref<AuctionListing | null>(null);
const selectedId = ref(0),
  quantity = ref(1),
  price = ref(100),
  durationHours = ref(12);
const sellable = computed(() =>
  (user.user?.inventory ?? []).filter(
    (entry) => !entry.isEquiped && entry.quantity > 0 && entry.item.rarity !== 'QUEST'
  )
);
const selected = computed(() => sellable.value.find((entry) => entry.id === selectedId.value));
let requestId = crypto.randomUUID();
watch([selectedId, quantity, price, durationHours], () => {
  requestId = crypto.randomUUID();
});
watch(selectedId, () => {
  quantity.value = 1;
});
const now = ref(Date.now());
let clockOffset = 0,
  requestVersion = 0;
const blocked = (listing: AuctionListing) =>
  purchaseBlock(listing, user.user?.level ?? 1, user.user?.gold ?? 0, now.value);
const statusText = (listing: AuctionListing) =>
  listing.status === 'ACTIVE'
    ? Date.parse(listing.expiresAt) <= now.value
      ? 'Expired · returning item'
      : `Ends in ${timeLeft(listing.expiresAt, now.value)}`
    : {
        SOLD: 'Sold',
        RETURNED: 'Returned to inventory',
        RETURN_PENDING: 'Awaiting claim',
        FORFEITED: 'Claim period expired',
      }[listing.status];
async function load() {
  const version = ++requestVersion;
  if (!inTown.value) {
    listings.value = undefined;
    confirmListing.value = null;
    loading.value = false;
    return;
  }
  if (tab.value === 'sell') {
    loading.value = false;
    return;
  }
  try {
    const result = await auctionApi.list(page.value, tab.value);
    if (version !== requestVersion) return;
    listings.value = result;
    clockOffset = Date.parse(result.serverTime) - Date.now();
    now.value = Date.now() + clockOffset;
    error.value = '';
  } catch (e) {
    if (version === requestVersion) error.value = e instanceof Error ? e.message : 'Could not load auction';
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}
function switchTab(value: Tab) {
  if (busy.value) return;
  tab.value = value;
  page.value = 1;
}
watch([tab, page], () => {
  loading.value = tab.value !== 'sell';
  void load();
});
async function refresh() {
  await user.fetchCurrentUser(true);
  await load();
}
async function afterTrade(message: string) {
  notice.value = message;
  await user.fetchCurrentUser(true);
  await queries.invalidateQueries({ queryKey: ['notifications-summary'] });
  await load();
}
async function submitListing() {
  if (!inTown.value || !selected.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await auctionApi.create({
      requestId,
      inventoryItemId: selected.value.id,
      quantity: quantity.value,
      price: price.value,
      durationHours: durationHours.value,
    });
    requestId = crypto.randomUUID();
    selectedId.value = 0;
    await afterTrade('Your item is now listed for every player to see.');
    tab.value = 'mine';
    page.value = 1;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not list item';
  } finally {
    busy.value = false;
  }
}
async function buy() {
  if (!inTown.value || !confirmListing.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await auctionApi.buy(confirmListing.value.id);
    confirmListing.value = null;
    await afterTrade('Purchase complete. The item is in your inventory.');
  } catch (e) {
    confirmListing.value = null;
    error.value = e instanceof Error ? e.message : 'Purchase failed';
  } finally {
    busy.value = false;
  }
}
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void refresh().catch((e: unknown) => {
    loading.value = false;
    error.value = e instanceof Error ? e.message : 'Could not refresh your profile';
  });
  let ticks = 0;
  timer = setInterval(() => {
    now.value = Date.now() + clockOffset;
    if (++ticks % 30 === 0 && !busy.value && !document.hidden) void load();
  }, 1000);
});
onUnmounted(() => {
  clearInterval(timer);
  requestVersion++;
});
</script>
