<template>
  <section class="mt-6 overflow-hidden rounded-2xl border border-[#d8bd75]/30 bg-[#0b2530] shadow-xl">
    <header
      class="flex flex-col gap-3 border-b border-[#d8bd75]/20 bg-[linear-gradient(135deg,#102f3a_0%,#0a202a_100%)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div class="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#efca72] uppercase">
          <QIcon name="workspace_premium" size="20px" />
          {{ t('pvp.shopEyebrow') }}
        </div>
        <h2 class="mt-1 font-serif text-2xl font-semibold text-[#fff0bd]">{{ t('pvp.shopTitle') }}</h2>
        <p class="mt-1 text-sm text-[#a9bfba]">{{ t('pvp.shopSubtitle') }}</p>
      </div>

      <div class="rounded-xl border border-[#d8bd75]/25 bg-[#071a23] px-5 py-3 text-right">
        <div class="text-[10px] font-bold tracking-wider text-[#a9bfba] uppercase">{{ t('pvp.yourBalance') }}</div>
        <div class="mt-0.5 flex items-center justify-end gap-2 text-xl font-bold text-amber-300">
          <QIcon name="military_tech" size="24px" />
          {{ shop?.coinsOfHonour ?? currentUserStore.user?.coinsOfHonour ?? 0 }}
        </div>
      </div>
    </header>

    <div v-if="loading" class="flex items-center justify-center gap-3 py-20 text-amber-200">
      <QIcon name="hourglass_empty" size="28px" class="animate-spin" />
      <span class="text-sm font-semibold tracking-wide uppercase">{{ t('pvp.shopLoading') }}</span>
    </div>

    <div v-else-if="error" role="alert" class="m-6 rounded-xl border border-red-500/30 bg-red-950/50 p-5 text-red-200">
      {{ error }}
      <button class="ml-3 font-bold text-amber-200 underline" type="button" @click="loadShop">
        {{ t('pvp.shopRetry') }}
      </button>
    </div>

    <div v-else class="p-6">
      <div
        v-if="!shop?.offers.length"
        class="rounded-xl border border-[#d8bd75]/20 bg-[#071a23] px-5 py-12 text-center text-[#a9bfba]"
      >
        <QIcon name="inventory_2" size="36px" class="mb-2 text-[#806f43]" />
        <p>{{ t('pvp.shopSoldOut') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="offer in shop.offers"
          :key="offer.id"
          class="flex min-h-[270px] flex-col rounded-xl border border-[#d8bd75]/20 bg-[#071a23] p-4 transition hover:-translate-y-0.5 hover:border-[#d8bd75]/45 hover:shadow-xl"
        >
          <div class="flex items-start gap-4">
            <InventoryItem
              :item="toInventoryItem(offer)"
              slot-id=""
              class="h-24 w-24 shrink-0 border-[#806f43]! bg-[#102833]!"
            />

            <div class="min-w-0 flex-1 pt-1">
              <div class="text-[10px] font-bold tracking-wider uppercase" :class="rarityTextClass(offer.item.rarity)">
                {{ t(offer.kind === 'POTION' ? 'pvp.shopPotion' : 'pvp.shopUpgrade') }} ·
                {{ t(`profile.rarity.${offer.item.rarity.toLowerCase()}`) }}
              </div>
              <h3 class="mt-1 line-clamp-2 font-serif text-lg font-semibold text-[#fff0bd]" :title="offer.item.name">
                {{ offer.item.name }}
              </h3>
              <div class="mt-2 text-xs text-[#a9bfba]">
                {{ t('profile.summary.level') }} {{ offer.item.level }} ·
                {{ t('profile.requiredLevel', { level: offer.item.requiredPlayerLevel ?? 1 }) }}
              </div>
            </div>
          </div>

          <p class="mt-4 line-clamp-2 text-sm leading-5 text-[#a9bfba]">{{ offer.item.description }}</p>

          <div class="mt-auto flex items-center justify-between gap-3 border-t border-[#d8bd75]/15 pt-4">
            <div class="flex items-center gap-1.5 text-lg font-bold text-amber-300">
              <QIcon name="military_tech" size="22px" />
              {{ offer.cost }}
            </div>
            <button
              type="button"
              class="flex h-10 min-w-28 items-center justify-center gap-2 rounded-lg bg-[#bd4938] px-4 text-xs font-bold tracking-wider text-white uppercase shadow transition hover:bg-[#d15743] disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="buyingOfferId !== null || (shop.coinsOfHonour ?? 0) < offer.cost"
              @click="buyOffer(offer)"
            >
              <QIcon v-if="buyingOfferId === offer.id" name="hourglass_empty" size="16px" class="animate-spin" />
              <QIcon v-else name="shopping_bag" size="16px" />
              {{ buyingOfferId === offer.id ? t('pvp.shopBuying') : t('pvp.shopBuy') }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { Notify, QIcon } from 'quasar';
import { onMounted, ref } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getRarityTextClass } from '@/modules/Inventory/utils/rarity';
import type { PvpShop, PvpShopOffer } from '@/modules/Pvp/api';
import { pvpApi } from '@/modules/Pvp/api';
import { getApiErrorMessage } from '@/shared/api/error-message';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();
const shop = ref<PvpShop | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const buyingOfferId = ref<string | null>(null);

const loadShop = async () => {
  loading.value = true;
  error.value = null;
  try {
    shop.value = await pvpApi.getShop();
  } catch (err: unknown) {
    error.value = getApiErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

const toInventoryItem = (offer: PvpShopOffer): InventoryItemType => ({
  id: offer.item.id,
  nameKey: offer.item.name,
  name: offer.item.name,
  tooltipName: offer.item.name,
  level: offer.item.level,
  requiredPlayerLevel: offer.item.requiredPlayerLevel,
  icon: offer.item.icon,
  description: offer.item.description,
  rarity: t(`profile.rarity.${offer.item.rarity.toLowerCase()}`),
  rarityKey: offer.item.rarity,
  equipmentType: offer.item.equipmentType,
  attributes: offer.item.attributes,
  properties: offer.item.properties,
  blockChance: offer.item.blockChance,
  upgradeType: offer.upgradeType,
  upgradeValue: offer.upgradeValue,
});

const rarityTextClass = (rarity: PvpShopOffer['item']['rarity']) => getRarityTextClass(rarity);

const buyOffer = async (offer: PvpShopOffer) => {
  buyingOfferId.value = offer.id;
  try {
    const result = await pvpApi.buyShopOffer(offer.id);
    if (shop.value) {
      shop.value.offers = result.offers;
      shop.value.coinsOfHonour = result.coinsOfHonour;
    }
    await currentUserStore.fetchCurrentUser(true);
    Notify.create({ type: 'positive', message: t('pvp.shopPurchased', { item: offer.item.name }) });
  } catch (err: unknown) {
    Notify.create({ type: 'negative', message: getApiErrorMessage(err) });
  } finally {
    buyingOfferId.value = null;
  }
};

onMounted(() => void loadShop());
</script>
