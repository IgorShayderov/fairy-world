<template>
  <aside class="shop-inventory">
    <h2 class="shop-inventory-title">{{ t('shop.inventory') }}</h2>

    <div v-if="inventory.length === 0" class="shop-inventory-empty">
      {{ t('shop.inventoryEmpty') }}
    </div>

    <div v-else class="shop-inventory-list min-h-0 space-y-3">
      <div v-for="inv in inventory" :key="inv.id" class="shop-inventory-card">
        <div class="shop-inventory-summary">
          <InventoryItem
            :item="{
              name: itemTypeName(inv.item.equipmentType, inv.item.name),
              nameKey: itemTypeName(inv.item.equipmentType, inv.item.name),
              tooltipName: inv.item.name,
              level: inv.item.level ?? 1,
              requiredPlayerLevel: inv.item.requiredPlayerLevel ?? 1,
              icon: inv.item.icon,
              description: inv.item.description,
              price: inv.item.price,
              rarity: t(`profile.rarity.${inv.item.rarity.toLowerCase()}`),
              rarityKey: inv.item.rarity,
              equipmentType: inv.item.equipmentType,
              attributes: inv.item.attributes,
              properties: inv.item.properties,
            }"
            :comparison-item="findEquippedItem(inv.item)"
            :slot-id="''"
            class="shop-inventory-icon"
            @double-click="$emit('add-one-to-sell', inv.item.id, inv.item.name, inv.quantity)"
          />
          <div class="shop-inventory-copy">
            <span class="shop-inventory-name">
              {{ itemTypeName(inv.item.equipmentType, inv.item.name) }}
            </span>
            <span class="shop-inventory-count">×{{ inv.quantity }} шт.</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="shop-inventory-quantity">
            <button
              class="shop-inventory-adjust"
              :aria-label="`Reduce ${inv.item.name} sale quantity`"
              :disabled="loading"
              @click="$emit('adjust-sell', inv.item.id, inv.item.name, inv.quantity, -1)"
            >
              −
            </button>
            <input
              :value="sellQuantity[inv.item.id]"
              :aria-label="`${inv.item.name} sale quantity`"
              :disabled="loading"
              @input="
                (e) =>
                  $emit('update-sell-quantity', inv.item.id, inv.quantity, Number((e.target as HTMLInputElement).value))
              "
              type="number"
              min="0"
              :max="inv.quantity"
              class="shop-inventory-input"
            />
            <button
              class="shop-inventory-adjust"
              :aria-label="`Increase ${inv.item.name} sale quantity`"
              :disabled="loading"
              @click="$emit('adjust-sell', inv.item.id, inv.item.name, inv.quantity, 1)"
            >
              +
            </button>
          </div>

          <span class="shop-inventory-sale">
            {{ saleLineTotal(inv.item.price, sellQuantity[inv.item.id] ?? 0) }}g
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { EquipmentType, InventoryItemType } from '@/modules/Inventory/types';
import type { InventoryEntry } from '@/modules/Shop/types';

import { findEquippedItemForEntries } from '@/modules/Inventory/utils/equipment';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{
  inventory: InventoryEntry[];
  equippedItems: InventoryEntry[];
  sellQuantity: Record<number, number>;
  loading: boolean;
}>();

defineEmits<{
  (e: 'adjust-sell', id: number, name: string, currentQty: number, delta: number): void;
  (e: 'update-sell-quantity', id: number, currentQty: number, value: number): void;
  (e: 'add-one-to-sell', id: number, name: string, currentQty: number): void;
}>();

const { t } = useTranslation();
const saleLineTotal = (price: number, quantity: number) =>
  quantity > 0 ? Math.max(1, Math.floor(price * 0.5 * quantity)) : 0;
const itemTypeName = (equipmentTypes: EquipmentType[], name?: string) => t(getItemTypeLocaleKey(equipmentTypes, name));
const findEquippedItem = (targetItem: {
  equipmentType?: EquipmentType[];
  name?: string;
  isTwoHanded?: boolean;
}): InventoryItemType | null => {
  return findEquippedItemForEntries(
    props.equippedItems,
    targetItem,
    (entry) => itemTypeName(entry.item.equipmentType, entry.item.name),
    (rarity) => t(`profile.rarity.${rarity.toLowerCase()}`)
  );
};
</script>

<style scoped>
.shop-inventory {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  position: relative;
  z-index: 10;
  width: 320px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 20px;
  border-left: 1px solid #bca26955;
  background: #102b35;
  color: #d8e6e3;
}
.shop-inventory-title {
  margin: 0 0 16px;
  color: #f2d897;
  font:
    600 23px/1.3 Georgia,
    serif;
}
.shop-inventory-list {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-color: #526f73 #0b202b;
}
.shop-inventory-empty {
  align-self: start;
  padding: 16px;
  border: 1px solid #a3bec145;
  border-radius: 10px;
  color: #c0d4d2;
  text-align: center;
}
.shop-inventory-card {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  min-width: 0;
  gap: 8px;
  padding: 12px;
  border: 1px solid #bca26955;
  border-radius: 12px;
  background: linear-gradient(130deg, #1c4148, #0b202b);
}
.shop-inventory-summary {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #a3bec12b;
}
/* Important base-layer rules outrank the shared item's important utility styles. */
@layer base {
  .shop-inventory-icon {
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
    border: 1px solid #a3bec15c !important;
    background: #0b202b !important;
    box-shadow: inset 0 1px 12px #00000026 !important;
  }
  .shop-inventory-icon :deep(.q-icon),
  .shop-inventory-icon :deep(svg) {
    color: #c0d4d2 !important;
  }
}
.shop-inventory-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.shop-inventory-name {
  color: #f2d897;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.shop-inventory-count {
  color: #a9c3c5;
  font-size: 12px;
}
.shop-inventory-quantity {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid #a3bec145;
  border-radius: 8px;
  background: #091d27;
}
.shop-inventory-adjust {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 5px;
  background: #24434a;
  color: #f2d897;
  cursor: pointer;
}
.shop-inventory-adjust:hover:not(:disabled) {
  background: #37575e;
}
.shop-inventory-input {
  width: 44px;
  padding: 3px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #d8e6e3;
  font-size: 14px;
  text-align: center;
}
.shop-inventory-adjust:focus-visible,
.shop-inventory-input:focus-visible {
  outline: 2px solid #efd087;
  outline-offset: 2px;
}
.shop-inventory-adjust:disabled,
.shop-inventory-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.shop-inventory-sale {
  color: #efce86;
  font-size: 12px;
  font-weight: 600;
}
@media (max-width: 760px) {
  .shop-inventory {
    width: 100%;
    border-left: 0;
    border-top: 1px solid #bca26955;
    padding: 16px;
    grid-template-rows: auto auto;
    overflow: visible;
  }
  .shop-inventory-list {
    overflow: visible;
  }
}
</style>
