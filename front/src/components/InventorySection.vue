<template>
  <section class="flex flex-col">
    <h2 class="mb-3 text-xl font-bold text-gray-800">{{ t('profile.inventory') }}</h2>
    <div class="grid grid-cols-4 gap-3 rounded-xl bg-gray-200 p-4 shadow-inner">
      <InventoryItem
        v-for="(item, idx) in inventory"
        :key="idx"
        :item="{
          ...item,
          name: t(item.nameKey),
          rarity: item.rarityKey ? t(item.rarityKey) : undefined,
        }"
        :is-hovered="isHovered === null"
        :is-dragging="dragIndex === idx"
        @drag-start="$emit('drag-start', idx)"
        @drag-end="$emit('drag-end')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { InventoryItemType } from '@/shared/types/inventory';

import InventoryItem from '@/components/InventoryItem.vue';

defineProps<{
  inventory: InventoryItemType[];
  dragIndex: number | null;
  isHovered: string | null;
}>();

defineEmits<{
  (e: 'drag-start', idx: number): void;
  (e: 'drag-end'): void;
}>();

const { t } = useTranslation();
</script>
