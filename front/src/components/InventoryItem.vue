<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-2 cursor-grab active:cursor-grabbing"
    :class="{
      'border-blue-400 bg-blue-50': !!item,
      'border-red-400 bg-red-50': isHovered,
      'border-blue-500 bg-blue-100 shadow-md scale-105 z-10': isDragging,
    }"
    :draggable="!!item"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Пустой слот -->
    <template v-if="!item">
      <div class="flex flex-col items-center text-gray-400">
        <QIcon name="inventory_2" size="32px" class="mb-1 opacity-50" />
        <span class="text-xs">Пусто</span>
      </div>
    </template>

    <!-- Предмет -->
    <template v-else>
      <div class="flex flex-col items-center text-xs">
        <QIcon :name="item.icon" size="32px" class="text-gray-700 mb-1" />
        <span class="truncate w-full text-center font-medium text-gray-800">{{ item.name }}</span>
        <span v-if="item.rarity" class="mt-0.5 text-[10px] uppercase tracking-wide" :class="rarityClass">
          {{ item.rarity }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { QIcon } from 'quasar';

export interface InventoryItem {
  name: string;
  icon: string;
  rarity?: string;
}

export interface EquipmentSlot {
  id: string;
  label: string;
  item: InventoryItem | null;
}

const props = withDefaults(defineProps<{
  item: InventoryItem | null;
  slotId?: string;
  isHovered?: boolean;
  isDragging?: boolean;
}>(), {
  isHovered: false,
  isDragging: false,
});

const emit = defineEmits<{
  (e: 'drag-start', item: InventoryItem): void;
  (e: 'drop', item: InventoryItem): void;
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
  if (!props.item) {
    const name = e.dataTransfer?.getData('text/plain') ?? '';
    if (name) {
      emit('drop', { name, icon: 'inventory_2', rarity: 'Обычный' });
    }
  }
};
</script>

<style lang="scss" scoped>
// Drag ghost opacity
:deep(.css-1d3zcjo) {
  opacity: 0.6;
}
</style>
