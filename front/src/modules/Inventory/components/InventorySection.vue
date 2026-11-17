<template>
  <section class="flex min-w-[400px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <SectionNavigation
      :title="
        currentPage >= gemPageStart
          ? `Equipment gems (${equipmentGems.length}/100)`
          : currentPage === NORMAL_PAGES
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
          class="shrink-0"
          style="width: var(--profile-slot-size, 96px); height: var(--profile-slot-size, 96px)"
          @drag-start="$emit('drag-start', getAbsoluteIndex(idx))"
          @drag-end="$emit('drag-end')"
          @dragover.prevent
          @drop="$emit('inventory-drop', getAbsoluteIndex(idx))"
          @double-click="$emit('item-double-click', getAbsoluteIndex(idx))"
        />
      </div>
      <div v-else-if="currentPage < gemPageStart" class="grid grid-cols-3 gap-4">
        <CraftInventorySlot v-for="(item, idx) in displayedCraftInventory" :key="`craft-${idx}`" :item="item" />
      </div>
      <div v-else class="grid grid-cols-3 gap-4">
        <div
          v-for="(gem, idx) in displayedGems"
          :key="gem?.id ?? `empty-gem-${idx}`"
          class="equipment-gem-slot relative shrink-0 rounded-lg border-2 border-solid border-gray-200 bg-white p-2 text-center"
          style="width: var(--profile-slot-size, 96px); height: var(--profile-slot-size, 96px)"
          :tabindex="gem ? 0 : undefined"
        >
          <template v-if="gem">
            <span class="text-3xl text-cyan-300" aria-hidden="true">◆</span>
            <span class="text-xs font-semibold">+{{ gem.value }} {{ gem.type.toLowerCase() }}</span>
            <DiscardGemButton :gem="gem" />
            <QTooltip :delay="1000">
              Equipment gem · +{{ gem.value }} {{ gem.type.toLowerCase() }}.<br />
              Visit the Blacksmith to insert it into an item's empty socket.
            </QTooltip>
          </template>
          <span v-else class="text-[9px] font-semibold uppercase">{{ t('profile.slots.empty') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QTooltip } from 'quasar';
import { ref, computed, watch } from 'vue';

import type { CraftInventoryItem, EquipmentSlot, InventoryItemType } from '@/modules/Inventory/types';

import type { EquipmentGem } from '@/modules/Castles/api';
import { findEquippedItemForInventoryItem } from '@/modules/Inventory/utils/equipment';

import CraftInventorySlot from './CraftInventoryItem.vue';
import ScrollIcon from './icons/ScrollIcon.vue';
import InventoryItem from './InventoryItem.vue';

import DiscardGemButton from '@/modules/Castles/DiscardGemButton.vue';
import SectionNavigation from '@/shared/components/SectionNavigation.vue';

const props = withDefaults(
  defineProps<{
    inventory: (InventoryItemType | null)[];
    equipmentSlots: EquipmentSlot[];
    dragIndex: number | null;
    isHovered: string | null;
    craftInventory: CraftInventoryItem[];
    craftingAvailable: boolean;
    equipmentGems?: EquipmentGem[];
  }>(),
  { equipmentGems: () => [] }
);

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

const gemPageStart = computed(() => NORMAL_PAGES + (props.craftingAvailable ? 1 : 0));
const totalPages = computed(() => gemPageStart.value + Math.ceil(props.equipmentGems.length / ITEMS_PER_PAGE));
watch(totalPages, (count) => {
  currentPage.value = Math.min(currentPage.value, Math.max(0, count - 1));
});
const displayedGems = computed(() => {
  const start = (currentPage.value - gemPageStart.value) * ITEMS_PER_PAGE;
  const items: Array<EquipmentGem | null> = props.equipmentGems.slice(start, start + ITEMS_PER_PAGE);
  while (items.length < ITEMS_PER_PAGE) items.push(null);
  return items;
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

<style scoped>
.equipment-gem-slot {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
}
.equipment-gem-slot > span {
  max-width: 100%;
  overflow-wrap: anywhere;
}
.equipment-gem-slot :deep(.discard-gem) {
  flex: 0 0 auto;
  max-width: 100%;
  line-height: 1.2;
}
</style>
