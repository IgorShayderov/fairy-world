<template>
  <div
    class="relative flex cursor-grab flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 transition-all"
    :class="{
      'border-solid border-gray-200 bg-white shadow-sm': !!item && !isHovered && !isDragging,
      'bg-gray-100/50': !item && !isHovered,
      'border-red-400 bg-red-50': isHovered,
      'z-10 scale-105 cursor-grabbing border-blue-500 bg-blue-100 shadow-md': isDragging,
    }"
    :draggable="!!item"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <template v-if="!item">
      <div class="flex flex-col items-center justify-center text-gray-400">
        <QIcon :name="emptyIcon || 'inventory_2'" size="28px" class="mb-1 opacity-40" />
        <span class="text-center text-[9px] leading-tight font-semibold tracking-wider text-gray-400 uppercase">
          {{ emptyLabel || 'Пусто' }}
        </span>
      </div>
    </template>

    <template v-else>
      <div class="flex h-full w-full flex-col items-center justify-center text-xs">
        <QIcon :name="item.icon" size="32px" class="mb-1 text-gray-700" />
        <span class="w-full truncate text-center font-medium text-gray-800">{{ item.name }}</span>
        <span v-if="item.rarity" class="mt-0.5 text-[10px] tracking-wide uppercase" :class="rarityClass">
          {{ item.rarity }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed } from 'vue';

import type { InventoryItemType } from '@shared/types/inventory';

const props = withDefaults(
  defineProps<{
    item: InventoryItemType | null;
    slotId?: string;
    isHovered?: boolean;
    isDragging?: boolean;
    emptyIcon?: string;
    emptyLabel?: string;
  }>(),
  {
    slotId: '',
    isHovered: false,
    isDragging: false,
    emptyIcon: '',
    emptyLabel: '',
  }
);

const emit = defineEmits<{
  (e: 'drag-start', item: InventoryItemType): void;
  (e: 'drop', item: InventoryItemType): void;
  (e: 'drag-over', slotId: string): void;
  (e: 'drag-leave'): void;
  (e: 'drag-end'): void;
}>();

const rarityClass = computed(() => {
  if (!props.item?.rarity) return 'text-gray-400';
  const r = props.item.rarity.toLowerCase();
  if (r.includes('редак') || r.includes('legendary')) return 'text-purple-600';
  if (r.includes('редкий') || r.includes('rare')) return 'text-blue-600';
  if (r.includes('ообычн') || r.includes('обычный') || r.includes('common')) return 'text-gray-500';
  return 'text-gray-400';
});

const onDragStart = (e: DragEvent) => {
  if (!props.item) return;
  e.dataTransfer?.setData('text/plain', props.item.name);
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
  emit('drag-start', props.item);
};

const onDragEnd = () => {
  emit('drag-end');
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  if (props.slotId) {
    emit('drag-over', props.slotId);
  }
};

const onDragLeave = () => {
  emit('drag-leave');
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();

  if (props.item) {
    emit('drop', props.item);
  } else {
    emit('drop', { name: '', icon: '', rarity: '' });
  }
};
</script>

<style lang="scss" scoped>
:deep(.css-1d3zcjo) {
  opacity: 0.6;
}
</style>
