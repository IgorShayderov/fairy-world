<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 transition-all"
    :class="{
      'cursor-grab active:cursor-grabbing': !!item || !!occupiedItem,
      'cursor-default': !item && !occupiedItem,
      'border-solid border-gray-200 bg-white shadow-sm': (!!item || !!occupiedItem) && !isHovered && !isDragging,
      'bg-gray-100/50': !item && !occupiedItem && !isHovered,
      'border-red-400 bg-red-50': isHovered,
      'z-10 scale-105 cursor-grabbing border-blue-500 bg-blue-100 shadow-md': isDragging,
    }"
    :draggable="!!item || !!occupiedItem"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dblclick="onDoubleClick"
  >
    <template v-if="item">
      <div class="relative flex h-full w-full items-center justify-center">
        <img v-if="itemImage" :src="itemImage" alt="" class="h-12 w-12 object-contain" />
        <QIcon v-else :name="itemIcon" size="36px" class="text-gray-700" />
        <span
          v-if="item.quantity && item.quantity > 1"
          class="absolute -right-1 -bottom-1 rounded bg-black/60 px-1 py-0.2 text-[10px] font-bold text-white shadow-sm"
        >
          ×{{ item.quantity }}
        </span>
      </div>
    </template>

    <template v-else-if="occupiedItem">
      <div class="relative flex h-full w-full items-center justify-center">
        <img
          v-if="occupiedItemImage"
          :src="occupiedItemImage"
          alt=""
          class="h-12 w-12 object-contain opacity-50"
        />
        <QIcon v-else :name="occupiedItemIcon" size="36px" class="text-gray-700 opacity-50" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 shadow-sm">
            <QIcon name="lock" size="16px" class="text-gray-300" />
          </div>
        </div>
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
      v-if="displayItem"
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
      <div class="font-semibold">{{ displayItem.tooltipName ?? displayItem.name ?? displayItem.nameKey }}</div>
      <div
        v-if="displayRarity"
        class="mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
        :class="rarityBadgeClass"
      >
        {{ displayRarity }}
      </div>
      <div
        v-if="isTwoHanded(displayItem)"
        class="mt-1 ml-1 inline-flex rounded border border-purple-500/40 bg-purple-900/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-purple-200 uppercase"
      >
        {{ $t('profile.twoHanded') }}
      </div>
      <div v-if="tooltipDescription" class="mt-1 text-xs text-gray-200">{{ tooltipDescription }}</div>
      <div v-if="effectiveRequiredPlayerLevel" class="mt-1 text-xs text-amber-200">
        {{ $t('profile.requiredLevel', { level: effectiveRequiredPlayerLevel }) }}
      </div>
      <div v-if="displayItem.price !== undefined" class="mt-2 text-xs">
        {{ $t('profile.tooltip.price') }}: {{ displayItem.price }}g
      </div>
      <div v-if="displayItem.attributes?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.attributes') }}</div>
        <div v-for="attribute in displayItem.attributes" :key="attribute.name">
          <div>{{ modifierName(attribute.name, 'attribute') }}: {{ signedValue(attribute.value) }}</div>
        </div>
      </div>
      <div v-if="displayItem.properties?.length" class="mt-2 text-xs">
        <div class="font-semibold">{{ $t('profile.tooltip.properties') }}</div>
        <div v-for="property in displayItem.properties" :key="property.name">
          <div>{{ modifierName(property.name, 'property') }}: {{ signedValue(property.value) }}</div>
        </div>
      </div>

      <div v-if="comparisonItem" class="mt-3 border-t border-gray-600 pt-3">
        <div class="mb-2 text-xs font-semibold text-gray-200">{{ $t('shop.comparedWithEquipped') }}</div>
        <div class="flex items-center gap-2">
          <div v-if="comparisonItems.length > 1" class="flex shrink-0 items-center gap-1">
            <template v-for="(comp, i) in comparisonItems" :key="i">
              <span v-if="i > 0" class="text-xs font-bold text-gray-400">+</span>
              <img v-if="resolveItemImage(comp)" :src="resolveItemImage(comp)" alt="" class="h-8 w-8 object-contain" />
              <QIcon v-else :name="resolveItemIcon(comp)" size="24px" class="text-gray-200" />
            </template>
          </div>
          <template v-else>
            <img v-if="comparisonItemImage" :src="comparisonItemImage" alt="" class="h-10 w-10 object-contain" />
            <QIcon v-else :name="comparisonItemIcon" size="28px" class="text-gray-200" />
          </template>
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

import { isTwoHanded } from '@/modules/Inventory/utils/equipment';
import { getPotionRequiredLevel, isPotion } from '@/modules/Inventory/utils/potions';
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
    occupiedItem?: InventoryItemType | null;
  }>(),
  {
    slotId: '',
    isHovered: false,
    isDragging: false,
    emptyIcon: '',
    emptyLabel: '',
    comparisonItem: null,
    occupiedItem: null,
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

const displayItem = computed(() => props.item ?? props.occupiedItem);
const itemImage = computed(() => resolveItemImage(props.item));
const occupiedItemImage = computed(() => resolveItemImage(props.occupiedItem));
const occupiedItemIcon = computed(() => resolveItemIcon(props.occupiedItem));
const comparisonItemImage = computed(() => resolveItemImage(props.comparisonItem));
const comparisonItemIcon = computed(() => resolveItemIcon(props.comparisonItem));

const displayRarity = computed(() => {
  const current = displayItem.value;
  if (current?.rarityKey) return t(`profile.rarity.${current.rarityKey.toLowerCase()}`);
  return current?.rarity;
});

const effectiveRequiredPlayerLevel = computed(() => {
  const current = displayItem.value;
  if (!current) return 0;
  if (isPotion(current)) {
    return Math.max(current.requiredPlayerLevel ?? 1, getPotionRequiredLevel(current.name ?? current.nameKey));
  }
  return current.requiredPlayerLevel ?? 1;
});

const rarityBadgeClass = computed(() => getRarityBadgeClass(displayItem.value?.rarityKey ?? displayItem.value?.rarity));
const comparisonItemRarity = computed(() => {
  if (props.comparisonItem?.rarityKey) {
    return t(`profile.rarity.${props.comparisonItem.rarityKey.toLowerCase()}`);
  }
  return props.comparisonItem?.rarity;
});
const comparisonItemRarityClass = computed(() =>
  getRarityBadgeClass(props.comparisonItem?.rarityKey ?? props.comparisonItem?.rarity)
);
const comparisonItems = computed(() => {
  return props.comparisonItem?.comparisonItems ?? (props.comparisonItem ? [props.comparisonItem] : []);
});
const tooltipDescription = computed(() =>
  removeRarityPrefix(displayItem.value?.description ?? '', displayItem.value?.rarityKey ?? '')
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
  const active = displayItem.value;
  if (!active) return;
  e.dataTransfer?.setData('text/plain', active.name ?? active.nameKey);
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
  emit('drag-start', active);
};

const onDragEnd = () => {
  emit('drag-end');
};

const onDoubleClick = () => {
  const active = displayItem.value;
  if (active) emit('double-click', active);
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

  if (displayItem.value) {
    emit('drop', displayItem.value);
  } else {
    emit('drop', { name: '', nameKey: '', icon: '', rarity: '' });
  }
};
</script>
