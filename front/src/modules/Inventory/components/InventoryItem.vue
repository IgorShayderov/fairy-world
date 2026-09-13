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

    <QMenu
      v-if="item"
      class="max-w-lg overflow-y-auto bg-gray-900 p-3 text-white"
      anchor="top middle"
      self="bottom middle"
      max-height="70vh"
      max-width="32rem"
      hover
      :hover-hide-delay="300"
      no-focus
      no-refocus
    >
      <div class="font-semibold">{{ item.tooltipName ?? item.name ?? item.nameKey }}</div>
      <div
        v-if="displayRarity"
        class="mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
        :class="rarityBadgeClass"
      >
        {{ displayRarity }}
      </div>
      <div v-if="tooltipDescription" class="mt-1 text-xs text-gray-200">{{ tooltipDescription }}</div>
      <div v-if="item.requiredPlayerLevel" class="mt-1 text-xs text-amber-200">
        {{ $t('profile.requiredLevel', { level: item.requiredPlayerLevel }) }}
      </div>
      <div v-if="item.price !== undefined" class="mt-2 text-xs">
        {{ $t('profile.tooltip.price') }}: {{ item.price }}g
      </div>
      <div v-if="item.attributes?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.attributes') }}</div>
        <div v-for="attribute in item.attributes" :key="attribute.name">
          <div>{{ modifierName(attribute.name, 'attribute') }}: {{ signedValue(attribute.value) }}</div>
          <div v-if="attribute.description" class="text-gray-300">{{ attribute.description }}</div>
        </div>
      </div>
      <div v-if="item.properties?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.properties') }}</div>
        <div v-for="property in item.properties" :key="property.name">
          <div>{{ modifierName(property.name, 'property') }}: {{ signedValue(property.value) }}</div>
          <div v-if="property.description" class="text-gray-300">{{ property.description }}</div>
        </div>
      </div>

      <div v-if="comparisonItem" class="mt-3 border-t border-gray-600 pt-3">
        <div class="mb-2 text-xs font-semibold text-gray-200">{{ $t('shop.comparedWithEquipped') }}</div>
        <div class="flex items-center gap-2">
          <img v-if="comparisonItemImage" :src="comparisonItemImage" alt="" class="h-10 w-10 object-contain" />
          <QIcon v-else :name="comparisonItemIcon" size="28px" class="text-gray-200" />
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">
              {{ comparisonItem.tooltipName ?? comparisonItem.name ?? comparisonItem.nameKey }}
            </div>
            <span
              v-if="comparisonItemRarity"
              class="mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
              :class="comparisonItemRarityClass"
            >
              {{ comparisonItemRarity }}
            </span>
          </div>
        </div>

        <div v-for="group in comparisonGroups" :key="group.key" class="mt-3 text-xs">
          <div class="mb-1 font-semibold">{{ group.label }}</div>
          <div class="grid grid-cols-[minmax(90px,1fr)_55px_65px_55px] gap-x-2 text-right">
            <span></span>
            <span class="text-gray-400">{{ $t('shop.thisItem') }}</span>
            <span class="text-gray-400">{{ $t('shop.equipped') }}</span>
            <span class="text-gray-400">{{ $t('shop.difference') }}</span>
            <template v-for="row in group.rows" :key="row.name">
              <span class="truncate text-left">{{ row.label }}</span>
              <span>{{ signedValue(row.currentValue) }}</span>
              <span>{{ signedValue(row.equippedValue) }}</span>
              <span :class="differenceClass(row.difference)">{{ signedValue(row.difference) }}</span>
            </template>
          </div>
        </div>
      </div>
    </QMenu>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QIcon, QMenu } from 'quasar';
import { computed } from 'vue';

import type { Component } from 'vue';
import type { InventoryItemType } from '@/modules/Inventory/types';

import { getRarityBadgeClass, removeRarityPrefix } from '@/modules/Inventory/utils/rarity';

const CONFIGURED_ITEM_IMAGES: Record<string, string> = {
  'icon_sword.png': '/icons/items/icon_sword.png',
  'icon_sword_2.png': '/icons/items/icon_sword_2.png',
  'icon_shield.png': '/icons/items/icon_shield.png',
  'icon_shield_2.png': '/icons/items/icon_shield_2.png',
  'icon_armor.png': '/icons/items/icon_armor.png',
  'icon_armor_2.png': '/icons/items/icon_armor_2.png',
  'icon_helmet.png': '/icons/items/icon_helmet.png',
  'icon_helmet_2.png': '/icons/items/icon_helmet_2.png',
  'icon_boots.png': '/icons/items/icon_boots.png',
  'icon_boots_2.png': '/icons/items/icon_boots_2.png',
  'icon_gloves.png': '/icons/items/icon_gloves.png',
  'icon_gloves_2.png': '/icons/items/icon_gloves_2.png',
  'icon_legs.png': '/icons/items/icon_legs.png',
  'icon_legs_2.png': '/icons/items/icon_legs_2.png',
  'icon_ring.png': '/icons/items/icon_ring.png',
  'icon_ring_2.png': '/icons/items/icon_ring_2.png',
  'icon_amulet.png': '/icons/items/icon_amulet.png',
  'icon_amulet_2.png': '/icons/items/icon_amulet_2.png',
};

const ITEM_TYPE_IMAGES: Partial<Record<string, string>> = {
  WEAPON: '/icons/items/icon_sword.png',
  SHIELD: '/icons/items/icon_shield.png',
  BODY: '/icons/items/icon_armor.png',
  HELMET: '/icons/items/icon_helmet.png',
  BOOTS: '/icons/items/icon_boots.png',
  GLOVES: '/icons/items/icon_gloves.png',
  LEGS: '/icons/items/icon_legs.png',
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
    comparisonItem?: InventoryItemType | null;
  }>(),
  {
    slotId: '',
    isHovered: false,
    isDragging: false,
    emptyIcon: '',
    emptyLabel: '',
    comparisonItem: null,
  }
);

const { t } = useTranslation();

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

const resolveItemImage = (item: InventoryItemType | null | undefined) => {
  const type = item?.equipmentType?.[0];
  return CONFIGURED_ITEM_IMAGES[item?.icon ?? ''] ?? ITEM_TYPE_IMAGES[type ?? ''];
};

const resolveItemIcon = (item: InventoryItemType | null | undefined) => {
  const type = item?.equipmentType?.[0];
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
};

const itemImage = computed(() => resolveItemImage(props.item));
const comparisonItemImage = computed(() => resolveItemImage(props.comparisonItem));
const comparisonItemIcon = computed(() => resolveItemIcon(props.comparisonItem));

const displayRarity = computed(() => {
  if (props.item?.rarityKey) return t(`profile.rarity.${props.item.rarityKey.toLowerCase()}`);
  return props.item?.rarity;
});

const rarityBadgeClass = computed(() => getRarityBadgeClass(props.item?.rarityKey ?? props.item?.rarity));
const comparisonItemRarity = computed(() => {
  if (props.comparisonItem?.rarityKey) {
    return t(`profile.rarity.${props.comparisonItem.rarityKey.toLowerCase()}`);
  }
  return props.comparisonItem?.rarity;
});
const comparisonItemRarityClass = computed(() =>
  getRarityBadgeClass(props.comparisonItem?.rarityKey ?? props.comparisonItem?.rarity)
);
const tooltipDescription = computed(() =>
  removeRarityPrefix(props.item?.description ?? '', props.item?.rarityKey ?? '')
);

type ModifierKind = 'attribute' | 'property';
type ComparisonRow = {
  name: string;
  label: string;
  currentValue: number;
  equippedValue: number;
  difference: number;
};

const modifierName = (name: string, kind: ModifierKind) => {
  const key = `profile.${kind === 'attribute' ? 'attributeNames' : 'propertyNames'}.${name}`;
  const translated = t(key);
  return translated === key ? name : translated;
};

const buildComparisonRows = (kind: ModifierKind): ComparisonRow[] => {
  const field = kind === 'attribute' ? 'attributes' : 'properties';
  const currentModifiers = props.item?.[field] ?? [];
  const equippedModifiers = props.comparisonItem?.[field] ?? [];
  const names = new Set([...currentModifiers.map(({ name }) => name), ...equippedModifiers.map(({ name }) => name)]);

  return [...names].map((name) => {
    const currentValue = currentModifiers.find((modifier) => modifier.name === name)?.value ?? 0;
    const equippedValue = equippedModifiers.find((modifier) => modifier.name === name)?.value ?? 0;
    return {
      name,
      label: modifierName(name, kind),
      currentValue,
      equippedValue,
      difference: currentValue - equippedValue,
    };
  });
};

const comparisonGroups = computed(() =>
  [
    { key: 'attributes', label: t('profile.tooltip.attributes'), rows: buildComparisonRows('attribute') },
    { key: 'properties', label: t('profile.tooltip.properties'), rows: buildComparisonRows('property') },
  ].filter(({ rows }) => rows.length > 0)
);

const signedValue = (value: number) => `${value > 0 ? '+' : ''}${value}`;
const differenceClass = (difference: number) => ({
  'font-semibold text-green-400': difference > 0,
  'font-semibold text-red-400': difference < 0,
  'text-gray-300': difference === 0,
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
