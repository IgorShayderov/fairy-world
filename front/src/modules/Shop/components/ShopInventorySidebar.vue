<template>
  <aside class="relative z-10 w-[320px] flex-shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-sm">
    <h2 class="mb-4 text-lg font-bold text-gray-800">{{ t('shop.inventory') }}</h2>

    <div
      v-if="inventory.length === 0"
      class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500"
    >
      {{ t('shop.inventoryEmpty') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="inv in inventory"
        :key="inv.id"
        class="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 shadow-sm"
      >
        <div class="flex items-center gap-3 border-b border-gray-200 pb-2">
          <InventoryItem
            :item="{
              name: itemTypeName(inv.item.equipmentType),
              nameKey: itemTypeName(inv.item.equipmentType),
              tooltipName: inv.item.name,
              icon: inv.item.icon,
              description: inv.item.description,
              price: inv.item.price,
              rarity: t(`profile.rarity.${inv.item.rarity.toLowerCase()}`),
              rarityKey: inv.item.rarity,
              equipmentType: inv.item.equipmentType,
              attributes: inv.item.attributes,
              properties: inv.item.properties,
            }"
            :comparison-item="findEquippedItem(inv.item.equipmentType)"
            :slot-id="''"
            @double-click="$emit('add-one-to-sell', inv.item.id, inv.item.name, inv.quantity)"
          />
          <div class="flex flex-col">
            <span class="max-w-[140px] truncate text-sm font-semibold text-gray-800">
              {{ itemTypeName(inv.item.equipmentType) }}
            </span>
            <span class="text-xs font-medium text-gray-500">×{{ inv.quantity }} шт.</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="flex items-center gap-1 rounded bg-gray-200/50 p-1">
            <button
              class="flex h-6 w-6 items-center justify-center rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              @click="$emit('adjust-sell', inv.item.id, inv.item.name, inv.quantity, -1)"
            >
              −
            </button>
            <input
              :value="sellQuantity[inv.item.id]"
              @input="(e) => $emit('update-sell-quantity', inv.item.id, Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0"
              :max="inv.quantity"
              class="w-[40px] border-none bg-transparent px-1 text-center text-sm font-medium text-gray-800 focus:ring-0 focus:outline-none"
            />
            <button
              class="flex h-6 w-6 items-center justify-center rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              @click="$emit('adjust-sell', inv.item.id, inv.item.name, inv.quantity, 1)"
            >
              +
            </button>
          </div>

          <button
            class="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
            :disabled="!sellQuantity[inv.item.id] || loading"
            @click="$emit('sell', inv.item.id, inv.item.name, sellQuantity[inv.item.id] ?? 0)"
          >
            {{ t('shop.sell') }}
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { EquipmentType, InventoryItemType } from '@/modules/Inventory/types';
import type { InventoryEntry } from '@/modules/Shop/types';

import { findEquippedEntryForTypes } from '@/modules/Inventory/utils/equipment';
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
  (e: 'update-sell-quantity', id: number, value: number): void;
  (e: 'sell', id: number, name: string, quantity: number): void;
  (e: 'add-one-to-sell', id: number, name: string, currentQty: number): void;
}>();

const { t } = useTranslation();
const itemTypeName = (equipmentTypes: EquipmentType[]) => t(getItemTypeLocaleKey(equipmentTypes));
const findEquippedItem = (equipmentTypes: EquipmentType[]): InventoryItemType | null => {
  const equipped = findEquippedEntryForTypes(props.equippedItems, equipmentTypes);
  if (!equipped) return null;

  return {
    nameKey: equipped.item.name,
    name: itemTypeName(equipped.item.equipmentType),
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
