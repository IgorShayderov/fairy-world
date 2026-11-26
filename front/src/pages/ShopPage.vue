<template>
  <div class="shop-page">
    <div v-if="accessError" class="shop-access-message">{{ t('shop.townRequired') }}</div>
    <div v-else class="shop-panels">
      <main class="shop-main">
        <div class="shop-titlebar">
          <span class="shop-name">{{ shopName }}</span>
          <span class="shop-reserve">
            {{ t('shop.shopGold') }}: <span class="shop-gold">💰 {{ shopGold.toLocaleString() }} gold</span>
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

        <div class="shop-stock">
          <TownCharacter service="market" />
          <div v-if="loading && shopItems.length === 0" class="flex h-32 items-center justify-center">
            <div class="shop-loading">{{ t('shop.loading') }}</div>
          </div>

          <div v-else class="shop-products">
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

    <div v-if="sellToast.show" class="shop-toast" role="status">
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
import TownCharacter from '@/modules/Towns/TownCharacter.vue';

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
    (entry) => t(getItemTypeLocaleKey(entry.item.equipmentType, entry.item.name)),
    (rarity) => t(`profile.rarity.${rarity.toLowerCase()}`)
  );
};
</script>

<style scoped>
.shop-page {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: linear-gradient(135deg, #14353e, #091b26);
  color: #d8e6e3;
  color-scheme: dark;
}
.shop-panels {
  display: grid;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
}
.shop-main {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.shop-titlebar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  padding: 16px 24px 8px;
  flex-shrink: 0;
  background: #102b34;
}
.shop-name {
  color: #f2d897;
  font:
    600 21px/1.3 Georgia,
    serif;
}
.shop-reserve {
  color: #a9c3c5;
  font-size: 12px;
}
.shop-gold {
  color: #f2d897;
  font-weight: 600;
}
.shop-stock {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px;
  scrollbar-color: #52747a #0b202b;
  scrollbar-width: thin;
}
.shop-products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 16px;
}
.shop-access-message {
  padding: 24px;
  text-align: center;
  color: #c0d4d2;
}
.shop-loading {
  color: #a9c3c5;
}
.shop-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  padding: 14px 20px;
  max-width: calc(100vw - 48px);
  border: 1px solid #70bea7;
  border-radius: 10px;
  background: #173d39;
  color: #d8f1e6;
  box-shadow: 0 8px 24px #0005;
}
@media (max-width: 760px) {
  .shop-page {
    overflow-y: auto;
  }
  .shop-panels {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    overflow: visible;
    flex: none;
  }
  .shop-main {
    height: auto;
    flex: none;
  }
  .shop-main,
  .shop-stock {
    overflow: visible;
  }
  .shop-stock {
    padding: 16px;
  }
  .shop-titlebar {
    padding: 16px 16px 8px;
  }
}
</style>
