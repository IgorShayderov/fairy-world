<template>
  <section class="flex min-w-[400px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <SectionNavigation
      :title="t('profile.inventory')"
      :total-pages="totalPages"
      :current-index="currentPage"
      :disable-prev="currentPage === 0"
      :disable-next="currentPage >= totalPages - 1"
      @prev="prevPage"
      @next="nextPage"
    />

    <div class="flex w-full flex-1 flex-col items-center justify-center">
      <div class="grid grid-cols-3 gap-4">
        <InventoryItem
          v-for="(item, idx) in displayedInventory"
          :key="currentPage + '-' + idx"
          :item="item"
          :is-hovered="isHovered === null"
          :is-dragging="dragIndex === getAbsoluteIndex(idx)"
          :empty-icon="ScrollIcon"
          class="h-24 w-24 shrink-0"
          @drag-start="$emit('drag-start', getAbsoluteIndex(idx))"
          @drag-end="$emit('drag-end')"
          @dragover.prevent
          @drop="$emit('inventory-drop', getAbsoluteIndex(idx))"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, computed } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import ScrollIcon from './icons/ScrollIcon.vue';
import InventoryItem from './InventoryItem.vue';

import SectionNavigation from '@/shared/components/SectionNavigation.vue';

const props = defineProps<{
  inventory: (InventoryItemType | null)[];
  dragIndex: number | null;
  isHovered: string | null;
}>();

defineEmits<{
  (e: 'drag-start', idx: number): void;
  (e: 'drag-end'): void;
  (e: 'inventory-drop', idx: number): void;
}>();

const { t } = useTranslation();

const ITEMS_PER_PAGE = 12;
const currentPage = ref(0);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.inventory.length / ITEMS_PER_PAGE));
});

const displayedInventory = computed(() => {
  const start = currentPage.value * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const sliced = props.inventory.slice(start, end);

  if (sliced.length < ITEMS_PER_PAGE) {
    const padding = Array(ITEMS_PER_PAGE - sliced.length).fill(null);
    return [...sliced, ...padding];
  }

  return sliced;
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
