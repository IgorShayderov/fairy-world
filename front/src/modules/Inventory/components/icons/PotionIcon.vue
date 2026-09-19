<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    class="potion-icon select-none"
  >
    <defs v-if="colors">
      <clipPath :id="`flask-clip-${uid}`">
        <path d="M9 8.5v2.15L5.65 16a3.2 3.2 0 0 0 2.72 4.9h7.26A3.2 3.2 0 0 0 18.35 16L15 10.65V8.5Z" />
      </clipPath>
      <linearGradient :id="`flask-liq-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="colors.liquidTop" />
        <stop offset="100%" :stop-color="colors.liquidBottom" />
      </linearGradient>
      <radialGradient :id="`flask-shine-${uid}`" cx="36%" cy="26%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="45%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <template v-if="!isFilled">
      <path
        d="M9 7.5v3.15L5.65 16a3.2 3.2 0 0 0 2.72 4.9h7.26A3.2 3.2 0 0 0 18.35 16L15 10.65V7.5M8.5 4h7v3.5h-7Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <path d="M8.3 17.5h7.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.45" />
    </template>

    <template v-else-if="colors">
      <ellipse cx="12" cy="21" rx="5.2" ry="0.8" fill="currentColor" opacity="0.16" />

      <!-- Glass body stays translucent so the category color is always visible. -->
      <path
        d="M9 7.5v3.15L5.65 16a3.2 3.2 0 0 0 2.72 4.9h7.26A3.2 3.2 0 0 0 18.35 16L15 10.65V7.5Z"
        fill="currentColor"
        fill-opacity="0.1"
        stroke="currentColor"
        stroke-width="1.35"
        stroke-linejoin="round"
      />
      <path
        :clip-path="`url(#flask-clip-${uid})`"
        d="M4.8 13.2c2.5-1 4.6.85 7.2.15 2.7-.75 4.9-1.45 7.2-.15V21H4.8Z"
        :fill="`url(#flask-liq-${uid})`"
      />
      <path
        d="M9 7.5v3.15L5.65 16a3.2 3.2 0 0 0 2.72 4.9h7.26A3.2 3.2 0 0 0 18.35 16L15 10.65V7.5Z"
        :fill="`url(#flask-shine-${uid})`"
        pointer-events="none"
      />
      <path
        d="M9 7.5v3.15L5.65 16a3.2 3.2 0 0 0 2.72 4.9h7.26A3.2 3.2 0 0 0 18.35 16L15 10.65V7.5Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.35"
        stroke-linejoin="round"
      />

      <!-- Cork, neck and rarity details. -->
      <rect x="8.4" y="3.35" width="7.2" height="4.2" rx="1.1" fill="#7c4a27" stroke="currentColor" stroke-width="1.2" />
      <path d="M9.35 4.55h5.3M9.35 6.2h5.3" stroke="#d7a66c" stroke-width="0.55" opacity="0.8" />
      <rect v-if="currentTier >= 2" x="8.1" y="7" width="7.8" height="1.65" rx="0.7" :fill="colors.liquidTop" stroke="currentColor" stroke-width="0.8" />
      <circle v-if="currentTier >= 3" cx="12" cy="7.85" r="1.05" :fill="colors.surfaceGlow" stroke="currentColor" stroke-width="0.55" />

      <!-- Readable effect emblem. -->
      <g fill="none" stroke="#ffffff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
        <path v-if="colors.category === 'HEALTH'" d="M12 14.1v4.4M9.8 16.3h4.4" />
        <path v-else-if="colors.category === 'ATTACK'" d="m13.9 13.8-3.8 4.7m.2-3.9 3 2.5m-3.7.5-.9.9m5.3-4.7.8-.8" />
        <path v-else-if="colors.category === 'DEFENSE'" d="M12 13.5 15 14.7v2.1c0 1.6-1.25 2.55-3 3.15-1.75-.6-3-1.55-3-3.15v-2.1Z" />
        <path v-else-if="colors.category === 'EXPERIENCE'" d="m12 13.4.85 1.75 1.95.28-1.4 1.37.33 1.95L12 17.82l-1.73.93.33-1.95-1.4-1.37 1.95-.28Z" />
        <path v-else-if="colors.category === 'FREE_ATTRIBUTE'" d="M12 13.5v5.5m-2.75-2.75h5.5M16.5 13v1.5M15.75 13.75h1.5" />
        <circle v-else cx="12" cy="16.4" r="1.9" />
      </g>

      <g fill="#ffffff">
        <circle cx="8.8" cy="17.5" r="0.55" opacity="0.75" />
        <circle v-if="currentTier >= 2" cx="15.4" cy="15.5" r="0.45" opacity="0.7" />
        <circle v-if="currentTier >= 3" cx="9.6" cy="14.7" r="0.35" opacity="0.65" />
      </g>
      <g v-if="currentTier >= 4" fill="none" :stroke="colors.surfaceGlow" stroke-width="0.8" stroke-linecap="round">
        <path d="M5.2 12.4 3.9 11m14.9 1.4 1.3-1.4" />
        <path d="M6.2 10.5 5.5 8.8m12.3 1.7.7-1.7" />
      </g>
      <path v-if="currentTier >= 5" d="m18.6 5 .55 1.25 1.25.55-1.25.55-.55 1.25-.55-1.25-1.25-.55 1.25-.55Z" :fill="colors.surfaceGlow" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { getPotionColorScheme, getPotionColorSchemeForCategory, getPotionTier } from '@/modules/Inventory/utils/potions';
import type { PotionCategory } from '@/modules/Inventory/utils/potions';

const props = withDefaults(
  defineProps<{
    item?: InventoryItemType | null;
    name?: string | undefined;
    category?: PotionCategory | undefined;
    tier?: number | undefined;
  }>(),
  {
    item: null,
    name: undefined,
    category: undefined,
    tier: undefined,
  }
);

const isFilled = computed(() => !!props.item || !!props.name || !!props.category);

const colors = computed(() => {
  if (!isFilled.value) return null;
  if (props.item) return getPotionColorScheme(props.item);
  if (props.name) return getPotionColorScheme({ name: props.name });
  if (props.category) return getPotionColorSchemeForCategory(props.category);
  return getPotionColorScheme();
});

const currentTier = computed(() => {
  if (props.tier !== undefined) return props.tier;
  if (props.item) {
    const name = props.item.tooltipName ?? props.item.name ?? props.item.nameKey;
    return getPotionTier(name, props.item.level);
  }
  if (props.name) return getPotionTier(props.name);
  return 1;
});

const instance = getCurrentInstance();
const uid = computed(() => {
  const base = instance?.uid ?? 'p';
  if (props.item && 'id' in props.item && props.item.id) {
    return `${props.item.id}-${base}`;
  }
  return `${base}`;
});
</script>
