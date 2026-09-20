<template>
  <div
    class="relative flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-solid border-gray-200 bg-white p-2 shadow-sm"
  >
    <template v-if="item">
      <img :src="`/icons/items/${item.icon}`" alt="" class="h-12 w-12 object-contain" />
      <span class="mt-1 max-w-full truncate text-center text-[10px] font-semibold text-gray-700">{{ item.name }}</span>
      <span class="absolute right-1 bottom-1 rounded bg-gray-900/75 px-1 text-[10px] font-bold text-white"
        >×{{ item.quantity }}</span
      >
      <QMenu hover no-focus no-refocus :hover-hide-delay="300" class="max-w-xs bg-gray-900 p-3 text-white">
        <div class="font-semibold">{{ item.name }}</div>
        <div class="mt-1 text-xs text-gray-300">{{ item.description }}</div>
        <div v-if="item.upgradeType" class="mt-2 text-xs font-semibold text-amber-300">
          {{ t('crafting.upgrade') }}: {{ t(`crafting.types.${item.upgradeType}`) }}
        </div>
      </QMenu>
    </template>
    <span v-else class="text-[9px] font-semibold tracking-wider text-gray-300 uppercase">{{
      t('profile.slots.empty')
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QMenu } from 'quasar';

import type { CraftInventoryItem } from '@/modules/Inventory/types';

defineProps<{ item: CraftInventoryItem | null }>();
const { t } = useTranslation();
</script>
