<template>
  <section class="flex min-w-[400px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <SectionNavigation
      :title="
        currentPage === NORMAL_PAGES
          ? t('crafting.craftInventory')
          : `${t('profile.inventory')} (${occupiedSlots}/${MAX_SLOTS})`
      "
      :total-pages="totalPages"
      :current-index="currentPage"
      :disable-prev="currentPage === 0"
      :disable-next="currentPage >= totalPages - 1"
      @prev="prevPage"
      @next="nextPage"
    />

    <div class="flex w-full flex-1 flex-col items-center justify-start">
      <div v-if="currentPage < NORMAL_PAGES" class="grid grid-cols-3 gap-4">
        <InventoryItem
          v-for="(item, idx) in displayedInventory"
          :key="currentPage + '-' + idx"
          :item="item"
          :comparison-item="item ? findEquippedItemForInventoryItem(equipmentSlots, item) : null"
          :is-hovered="isHovered === null"
          :is-dragging="dragIndex === getAbsoluteIndex(idx)"
          :disable-tooltip="dragIndex !== null"
          :empty-icon="ScrollIcon"
          class="h-24 w-24 shrink-0"
          @drag-start="$emit('drag-start', getAbsoluteIndex(idx))"
          @drag-end="$emit('drag-end')"
          @dragover.prevent
          @drop="$emit('inventory-drop', getAbsoluteIndex(idx))"
          @double-click="$emit('item-double-click', getAbsoluteIndex(idx))"
        />
      </div>
      <div v-else class="grid grid-cols-3 gap-4">
        <CraftInventorySlot v-for="(item, idx) in displayedCraftInventory" :key="`craft-${idx}`" :item="item" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, computed } from 'vue';

import type { CraftInventoryItem, EquipmentSlot, InventoryItemType } from '@/modules/Inventory/types';

import { findEquippedItemForInventoryItem } from '@/modules/Inventory/utils/equipment';

import CraftInventorySlot from './CraftInventoryItem.vue';
import ScrollIcon from './icons/ScrollIcon.vue';
import InventoryItem from './InventoryItem.vue';

import SectionNavigation from '@/shared/components/SectionNavigation.vue';

const props = defineProps<{
  inventory: (InventoryItemType | null)[];
  equipmentSlots: EquipmentSlot[];
  dragIndex: number | null;
  isHovered: string | null;
  craftInventory: CraftInventoryItem[];
}>();

defineEmits<{
  (e: 'drag-start', idx: number): void;
  (e: 'drag-end'): void;
  (e: 'inventory-drop', idx: number): void;
  (e: 'item-double-click', idx: number): void;
}>();

const { t } = useTranslation();

const MAX_SLOTS = 24;
const ITEMS_PER_PAGE = 12;
const NORMAL_PAGES = MAX_SLOTS / ITEMS_PER_PAGE;
const currentPage = ref(0);

const occupiedSlots = computed(() => props.inventory.filter((item) => item !== null).length);

const totalPages = computed(() => {
  return NORMAL_PAGES + 1;
});

const displayedCraftInventory = computed(() => {
  const items: Array<CraftInventoryItem | null> = props.craftInventory.filter(({ kind }) => kind === 'MATERIAL');
  while (items.length < ITEMS_PER_PAGE) items.push(null);
  return items.slice(0, ITEMS_PER_PAGE);
});

const displayedInventory = computed(() => {
  const start = currentPage.value * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const fullInventory = [...props.inventory];
  while (fullInventory.length < MAX_SLOTS) {
    fullInventory.push(null);
  }
  return fullInventory.slice(start, end);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

const getAbsoluteIndex = (localIdx: number) => {
  return currentPage.value * ITEMS_PER_PAGE + localIdx;
};
</script>
