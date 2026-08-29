<template>
  <div class="flex h-full min-h-0 flex-1 flex-col bg-gray-50 text-gray-900">
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ShopHeader :gold="gold" :cart-total="cartTotal()" :disabled="!cartHasItems() || loading" @buy="buyFromCart" />

        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="loading && shopItems.length === 0" class="flex h-32 items-center justify-center">
            <div class="text-gray-500">{{ t('shop.loading') }}</div>
          </div>

          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ShopProductCard
              v-for="item in shopItems"
              :key="item.id"
              :item="item"
              :cart-quantity="cart[item.id] || 0"
              @add="addToCart"
              @remove="removeFromCart"
            />
          </div>
        </div>

        <div
          v-if="Object.keys(cart).length > 0"
          class="shrink-0 border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-gray-500">{{ t('shop.inCart') }}</span>
            <span class="text-lg font-bold text-gray-900">{{ cartTotal() }} gold</span>
          </div>
        </div>
      </main>

      <ShopInventorySidebar
        :inventory="inventory"
        :sell-quantity="sellQuantity"
        :loading="loading"
        @adjust-sell="adjustSell"
        @update-sell-quantity="(id, val) => (sellQuantity[id] = val)"
        @sell="sellFromInventory"
      />
    </div>

    <div
      v-if="sellToast.show"
      class="fixed right-6 bottom-6 z-50 animate-bounce rounded-lg bg-green-500 px-5 py-3 text-sm font-medium text-white shadow-lg"
    >
      {{ sellToast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTranslation } from 'i18next-vue';

import { useShopActions } from '@/modules/Shop/composables/useShopActions';
import ShopHeader from '@/modules/Shop/components/ShopHeader.vue';
import ShopProductCard from '@/modules/Shop/components/ShopProductCard.vue';
import ShopInventorySidebar from '@/modules/Shop/components/ShopInventorySidebar.vue';

const { t } = useTranslation();

const {
  shopItems,
  inventory,
  gold,
  loading,
  cart,
  sellQuantity,
  sellToast,
  addToCart,
  removeFromCart,
  cartTotal,
  cartHasItems,
  buyFromCart,
  adjustSell,
  sellFromInventory,
  loadData,
} = useShopActions();

onMounted(async () => {
  await loadData();
});
</script>
