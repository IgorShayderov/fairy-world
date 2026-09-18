<template>
  <div class="flex h-full min-h-0 flex-1 flex-col bg-gray-50 text-gray-900">
    <div v-if="accessError" class="p-6 text-center text-gray-600">{{ t('shop.townRequired') }}</div>
    <div v-else class="shop-panels min-h-0 flex-1 overflow-hidden">
      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div class="shrink-0 flex items-center justify-between bg-white px-6 pt-2">
          <span class="font-semibold text-gray-800">{{ shopName }}</span>
          <span class="text-xs font-medium text-gray-500">
            {{ t('shop.shopGold') }}: <span class="font-bold text-yellow-600">💰 {{ shopGold.toLocaleString() }} gold</span>
          </span>
        </div>
        <ShopHeader
          :gold="gold"
          :gems="gems"
          :cart-total="cartTotal()"
          :disabled="!cartHasItems() || loading"
          :sell-total="sellTotal()"
          :sell-disabled="!sellHasItems() || loading"
          :refresh-cost="refreshCost"
          :refresh-disabled="loading || gems < refreshCost"
          :next-restock-at="nextRestockAt"
          @buy="buyFromCart"
          @sell="sellSelectedItems"
          @refresh="refreshStock"
          @restock-due="loadData"
        />

        <div class="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-6">
          <div v-if="loading && shopItems.length === 0" class="flex h-32 items-center justify-center">
            <div class="text-gray-500">{{ t('shop.loading') }}</div>
          </div>

          <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ShopProductCard
              v-for="item in shopItems"
              :key="item.id"
              :item="item"
              :cart-quantity="cart[item.id] || 0"
              :equipped-item="findEquippedItem(item)"
              @add="addToCart"
              @remove="removeFromCart"
            />
          </div>
        </div>

      </main>

      <ShopInventorySidebar
        :inventory="inventory"
        :equipped-items="equippedItems"
        :sell-quantity="sellQuantity"
        :loading="loading"
        @adjust-sell="adjustSell"
        @update-sell-quantity="setSellQuantity"
        @add-one-to-sell="addOneToSell"
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
import { useTranslation } from 'i18next-vue';
import { onMounted } from 'vue';

import type { EquipmentType, InventoryItemType } from '@/modules/Inventory/types';
import type { ShopItem } from '@/modules/Shop/types';

import { findEquippedItemForEntries } from '@/modules/Inventory/utils/equipment';
import { useShopActions } from '@/modules/Shop/composables/useShopActions';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

import ShopHeader from '@/modules/Shop/components/ShopHeader.vue';
import ShopInventorySidebar from '@/modules/Shop/components/ShopInventorySidebar.vue';
import ShopProductCard from '@/modules/Shop/components/ShopProductCard.vue';

const { t } = useTranslation();

const {
  accessError,
  shopName,
  shopGold,
  shopItems,
  inventory,
  equippedItems,
  gold,
  gems,
  refreshCost,
  nextRestockAt,
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
  setSellQuantity,
  sellTotal,
  sellHasItems,
  sellSelectedItems,
  addOneToSell,
  refreshStock,
  loadData,
} = useShopActions();

onMounted(async () => {
  await loadData(true);
});

const findEquippedItem = (
  targetItem: ShopItem | { equipmentType?: EquipmentType[]; name?: string; isTwoHanded?: boolean }
): InventoryItemType | null => {
  return findEquippedItemForEntries(
    equippedItems.value,
    targetItem,
    (entry) => t(getItemTypeLocaleKey(entry.item.equipmentType)),
    (rarity) => t(`profile.rarity.${rarity.toLowerCase()}`)
  );
};
</script>

<style scoped>
.shop-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
}
</style>
