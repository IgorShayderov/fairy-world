<template>
  <div class="flex h-full min-h-0 flex-1 flex-col bg-gray-50 text-gray-900">
    <div v-if="accessError" class="p-6 text-center text-gray-600">{{ t('shop.townRequired') }}</div>
    <div v-else class="shop-panels min-h-0 flex-1 overflow-hidden">
      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div class="shrink-0 bg-white px-6 pt-2 font-semibold">{{ shopName }}</div>
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
              :equipped-item="findEquippedItem(item.equipmentType)"
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

import { findEquippedEntryForTypes } from '@/modules/Inventory/utils/equipment';
import { useShopActions } from '@/modules/Shop/composables/useShopActions';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

import ShopHeader from '@/modules/Shop/components/ShopHeader.vue';
import ShopInventorySidebar from '@/modules/Shop/components/ShopInventorySidebar.vue';
import ShopProductCard from '@/modules/Shop/components/ShopProductCard.vue';

const { t } = useTranslation();

const {
  accessError,
  shopName,
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

const findEquippedItem = (equipmentTypes: EquipmentType[]): InventoryItemType | null => {
  const equipped = findEquippedEntryForTypes(equippedItems.value, equipmentTypes);
  if (!equipped) return null;

  return {
    nameKey: equipped.item.name,
    name: t(getItemTypeLocaleKey(equipped.item.equipmentType)),
    tooltipName: equipped.item.name,
    icon: equipped.item.icon,
    description: equipped.item.description,
    price: equipped.item.price,
    rarity: t(`profile.rarity.${equipped.item.rarity.toLowerCase()}`),
    rarityKey: equipped.item.rarity,
    equipmentType: equipped.item.equipmentType,
    attributes: equipped.item.attributes,
    properties: equipped.item.properties,
  };
};
</script>

<style scoped>
.shop-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
}
</style>
