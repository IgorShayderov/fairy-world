<template>
  <section class="flex min-w-[340px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-bold text-gray-800">{{ t('profile.inventory') }}</h2>

      <div class="flex gap-1">
        <button
          @click="scrollUp"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          @click="scrollDown"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="grid flex-1 grid-cols-3 content-start justify-center gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style="scrollbar-width: none"
    >
      <!-- Было: @drop.prevent="$emit('inventory-drop', idx)" -->
      <InventoryItem
        v-for="(item, idx) in inventory"
        :key="idx"
        :item="
          item
            ? {
                ...item,
                name: t(item.nameKey),
                rarity: item.rarityKey ? t(item.rarityKey) : undefined,
              }
            : null
        "
        :is-hovered="isHovered === null"
        :is-dragging="dragIndex === idx"
        class="h-24 w-24 shrink-0"
        @drag-start="$emit('drag-start', idx)"
        @drag-end="$emit('drag-end')"
        @dragover.prevent
        @drop="$emit('inventory-drop', idx)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref } from 'vue';

import type { InventoryItemType } from '@/shared/types/inventory';

import InventoryItem from '@/components/InventoryItem.vue';

defineProps<{
  inventory: (InventoryItemType | null)[];
  dragIndex: number | null;
  isHovered: string | null;
}>();

defineEmits<{
  (e: 'drag-start', idx: number): void;
  (e: 'drag-end'): void;
  (e: 'inventory-drop', idx: number): void; // <-- Добавляем это
}>();

const { t } = useTranslation();

// Scroll logic updated for vertical movement
const scrollContainer = ref<HTMLElement | null>(null);
const scrollAmount = 112; // 96px item height + 16px gap

const scrollUp = () => {
  scrollContainer.value?.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
};

const scrollDown = () => {
  scrollContainer.value?.scrollBy({ top: scrollAmount, behavior: 'smooth' });
};
</script>
