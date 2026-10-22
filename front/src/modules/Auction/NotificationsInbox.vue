<template>
  <section class="auction-page" :class="{ 'notifications-inbox--compact': compact }">
    <div class="auction-wrap">
      <header v-if="!compact" class="auction-header">
        <div>
          <p class="auction-kicker">Your courier inbox</p>
          <h1><QIcon name="notifications_none" /> Notifications</h1>
          <p class="auction-muted">
            Auction receipts and returned items. Pending returns must be claimed within seven days.
          </p>
        </div>
        <RouterLink v-if="user.user?.currentShopId" :to="routes.auctionPath()" class="auction-button"
          >Auction house</RouterLink
        >
      </header>
      <div v-if="error" role="alert" class="auction-error">
        {{ error }} <button class="underline" @click="load">Retry</button>
      </div>
      <p v-if="notice" role="status" class="auction-notice">{{ notice }}</p>
      <p v-if="loading" role="status">Loading notifications…</p>
      <div v-else-if="!data?.notifications.length" class="auction-empty">
        No notifications yet. Sales and returns will appear here.
      </div>
      <div v-else class="auction-inbox">
        <article
          v-for="entry in data.notifications"
          :key="entry.id"
          class="auction-card"
          :class="{ 'auction-unread': !entry.readAt }"
        >
          <div class="auction-meta">
            <h2 class="text-lg font-semibold text-[#f3dfaa]">{{ titles[effectiveKind(entry)] }}</h2>
            <time class="auction-muted">{{ new Date(entry.createdAt).toLocaleString() }}</time>
          </div>
          <AuctionItem :entry="entry.listing" />
          <p v-if="entry.kind === 'AUCTION_SOLD'" class="auction-upgrade">
            +{{ entry.listing.price.toLocaleString() }} gold has been added to your balance.
          </p>
          <p v-else-if="entry.kind === 'AUCTION_BOUGHT'" class="auction-muted">
            You paid {{ entry.listing.price.toLocaleString() }} gold. The item was delivered to your inventory.
          </p>
          <p v-else-if="entry.kind === 'AUCTION_RETURNED'" class="auction-muted">
            The unsold item was returned to your inventory.
          </p>
          <template v-else-if="canClaim(entry)"
            ><p class="auction-warning">
              Your inventory was full. Claim within {{ timeLeft(entry.listing.claimExpiresAt!, now) }} — by
              {{ new Date(entry.listing.claimExpiresAt!).toLocaleString() }}. After this deadline, the item is lost.
            </p>
            <div>
              <button class="auction-button auction-button--gold" :disabled="busy" @click="claim(entry.id)">
                Move to inventory</button
              ><RouterLink :to="routes.profilePath()" class="auction-button ml-3">Open inventory</RouterLink>
            </div></template
          >
          <p v-else class="auction-warning">The seven-day claim period ended. This item can no longer be recovered.</p>
          <footer v-if="!entry.readAt">
            <span class="auction-muted">Unread</span
            ><button class="auction-button" :disabled="busy" @click="read(entry.id)">Mark as read</button>
          </footer>
        </article>
      </div>
      <div v-if="data && data.total > data.pageSize" class="auction-pagination">
        <button class="auction-button" :disabled="page <= 1 || loading" @click="page--">Previous</button
        ><span>Page {{ page }} / {{ Math.ceil(data.total / data.pageSize) }}</span
        ><button class="auction-button" :disabled="page * data.pageSize >= data.total || loading" @click="page++">
          Next
        </button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { QIcon } from 'quasar';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { auctionApi, timeLeft, type AuctionNotification, type NotificationPage } from '@/modules/Auction/api';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import routes from '@/routes';

import AuctionItem from '@/modules/Auction/AuctionItem.vue';
import '@/modules/Auction/auction.css';

defineProps<{ compact?: boolean }>();

const queries = useQueryClient(),
  user = useCurrentUserStore();
const data = ref<NotificationPage>(),
  page = ref(1),
  loading = ref(true),
  busy = ref(false),
  error = ref(''),
  notice = ref(''),
  now = ref(Date.now());
let offset = 0,
  version = 0;
const titles = {
  AUCTION_SOLD: 'Your item sold',
  AUCTION_BOUGHT: 'Purchase received',
  AUCTION_RETURNED: 'Item returned',
  AUCTION_RETURN_PENDING: 'Item waiting to be claimed',
  AUCTION_RETURN_EXPIRED: 'Unclaimed item expired',
};
const canClaim = (entry: AuctionNotification) =>
  entry.listing.status === 'RETURN_PENDING' &&
  !!entry.listing.claimExpiresAt &&
  Date.parse(entry.listing.claimExpiresAt) > now.value;
const effectiveKind = (entry: AuctionNotification) =>
  entry.kind === 'AUCTION_RETURN_PENDING' && !canClaim(entry) ? 'AUCTION_RETURN_EXPIRED' : entry.kind;
async function load() {
  const current = ++version;
  try {
    const result = await auctionApi.notifications(page.value);
    if (current !== version) return;
    data.value = result;
    error.value = '';
    offset = Date.parse(result.serverTime) - Date.now();
    now.value = Date.now() + offset;
  } catch (e) {
    if (current === version) error.value = e instanceof Error ? e.message : 'Could not load notifications';
  } finally {
    if (current === version) loading.value = false;
  }
}
async function update(id: string, claimItem: boolean) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    if (claimItem) {
      await auctionApi.claim(id);
      notice.value = 'Item moved to your inventory.';
      await user.fetchCurrentUser(true);
    } else await auctionApi.read(id);
    await Promise.all([load(), queries.invalidateQueries({ queryKey: ['notifications-summary'] })]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not update notification';
  } finally {
    busy.value = false;
  }
}
const claim = (id: string) => update(id, true),
  read = (id: string) => update(id, false);
watch(page, () => {
  loading.value = true;
  void load();
});
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void load();
  let ticks = 0;
  timer = setInterval(() => {
    now.value = Date.now() + offset;
    if (++ticks % 30 === 0 && !busy.value && !document.hidden) void load();
  }, 1000);
});
onUnmounted(() => {
  clearInterval(timer);
  version++;
});
</script>

<style scoped>
.notifications-inbox--compact {
  flex: 1;
  min-height: 0;
  height: auto;
  padding: 1rem;
  overscroll-behavior: contain;
}
.notifications-inbox--compact :deep(.auction-meta) {
  align-items: flex-start;
}
.notifications-inbox--compact :deep(.auction-card) {
  padding: 1rem;
  overflow-wrap: anywhere;
}
</style>
