<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 transition-all"
    :class="{
      'cursor-grab active:cursor-grabbing': !!item,
      'cursor-default': !item,
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
    @dblclick="onDoubleClick"
  >
    <template v-if="item">
      <div class="flex h-full w-full flex-col items-center justify-center text-xs">
        <img v-if="itemImage" :src="itemImage" alt="" class="mb-1 h-12 w-12 object-contain" />
        <QIcon v-else :name="itemIcon" size="32px" class="mb-1 text-gray-700" />
        <span class="w-full truncate text-center font-medium text-gray-800">{{ item.name ?? item.nameKey }}</span>
        <span v-if="item.rarity" class="mt-0.5 text-[10px] tracking-wide uppercase" :class="rarityClass">
          {{ item.rarity }}
        </span>
        <span v-if="item.quantity && item.quantity > 1" class="text-[10px] font-semibold text-gray-500">
          ×{{ item.quantity }}
        </span>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center text-gray-400">
        <QIcon v-if="typeof emptyIcon === 'string'" :name="emptyIcon" size="32px" class="opacity-60" />

        <component v-else-if="emptyIcon" :is="emptyIcon" class="mb-1 h-8 w-8 text-gray-400 opacity-60" />
        <span class="text-center text-[9px] leading-tight font-semibold tracking-wider text-gray-400 uppercase">
          {{ emptyLabel || $t('profile.slots.empty') }}
        </span>
      </div>
    </template>

    <QTooltip v-if="item" class="max-w-xs bg-gray-900 p-3 text-white" anchor="top middle" self="bottom middle">
      <div class="font-semibold">{{ item.tooltipName ?? item.name ?? item.nameKey }}</div>
      <div v-if="item.description" class="mt-1 text-xs text-gray-200">{{ item.description }}</div>
      <div v-if="item.price !== undefined" class="mt-2 text-xs">
        {{ $t('profile.tooltip.price') }}: {{ item.price }}g
      </div>
      <div v-if="item.attributes?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.attributes') }}</div>
        <div v-for="attribute in item.attributes" :key="attribute.name">
          <div>{{ attribute.name }}: {{ attribute.value > 0 ? '+' : '' }}{{ attribute.value }}</div>
          <div v-if="attribute.description" class="text-gray-300">{{ attribute.description }}</div>
        </div>
      </div>
      <div v-if="item.properties?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.properties') }}</div>
        <div v-for="property in item.properties" :key="property.name">
          <div>{{ property.name }}: {{ property.value > 0 ? '+' : '' }}{{ property.value }}</div>
          <div v-if="property.description" class="text-gray-300">{{ property.description }}</div>
        </div>
      </div>
    </QTooltip>
  </div>
</template>

<script setup lang="ts">
import { QIcon, QTooltip } from 'quasar';
import { computed } from 'vue';

import type { Component } from 'vue';
import type { InventoryItemType } from '@/modules/Inventory/types';

const CONFIGURED_ITEM_IMAGES: Record<string, string> = {
  'icon_sword.png': '/icons/items/icon_sword.png',
  'icon_shield.png': '/icons/items/icon_shield.png',
  'icon_armor.png': '/icons/items/icon_armor.png',
  'icon_helmet.png': '/icons/items/icon_helmet.png',
  'icon_boots.png': '/icons/items/icon_boots.png',
  'icon_ring.png': '/icons/items/icon_ring.png',
  'icon_amulet.png': '/icons/items/icon_amulet.png',
};

const ITEM_TYPE_IMAGES: Partial<Record<string, string>> = {
  WEAPON: '/icons/items/icon_sword.png',
  SHIELD: '/icons/items/icon_shield.png',
  BODY: '/icons/items/icon_armor.png',
  HELMET: '/icons/items/icon_helmet.png',
  BOOTS: '/icons/items/icon_boots.png',
  RING: '/icons/items/icon_ring.png',
  AMULET: '/icons/items/icon_amulet.png',
};

const props = withDefaults(
  defineProps<{
    item: InventoryItemType | null;
    slotId?: string;
    isHovered?: boolean;
    isDragging?: boolean;
    emptyIcon?: string | Component;
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
  (e: 'double-click', item: InventoryItemType): void;
}>();

const itemIcon = computed(() => {
  const type = props.item?.equipmentType?.[0];

  const icons: Record<string, string> = {
    WEAPON: 'sports_martial_arts',
    SHIELD: 'shield',
    BODY: 'checkroom',
    HELMET: 'sports_motorsports',
    BOOTS: 'hiking',
    GLOVES: 'front_hand',
    LEGS: 'accessibility',
    RING: 'radio_button_unchecked',
    AMULET: 'diamond',
    SCROLL: 'description',
    POTION: 'science',
    UNKNOWN: 'help_outline',
  };

  return icons[type ?? 'UNKNOWN'] ?? 'help_outline';
});

const itemImage = computed(() => {
  const type = props.item?.equipmentType?.[0];

  return CONFIGURED_ITEM_IMAGES[props.item?.icon ?? ''] ?? ITEM_TYPE_IMAGES[type ?? ''];
});

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
  e.dataTransfer?.setData('text/plain', props.item.name ?? props.item.nameKey);
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
  emit('drag-start', props.item);
};

const onDragEnd = () => {
  emit('drag-end');
};

const onDoubleClick = () => {
  if (props.item) emit('double-click', props.item);
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
    emit('drop', { name: '', nameKey: '', icon: '', rarity: '' });
  }
};
</script>
