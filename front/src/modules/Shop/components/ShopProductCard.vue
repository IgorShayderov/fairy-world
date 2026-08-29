<template>
  <div
    class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <InventoryItem :item="{ name: item.name, icon: item.icon, rarity: t('profile.rarity.common') }" :slot-id="''" />
        <span class="font-bold text-gray-800">{{ item.name }}</span>
      </div>
      <span class="text-lg font-bold text-green-600">{{ item.price }}g</span>
    </div>

    <p class="text-sm text-gray-500">{{ item.description || '—' }}</p>

    <div class="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
      <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        <button
          class="flex h-6 w-6 items-center justify-center rounded bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
          @click="$emit('remove', item.id)"
        >
          −
        </button>
        <span class="min-w-[28px] text-center font-medium text-gray-800">{{ cartQuantity }}</span>
        <button
          class="flex h-6 w-6 items-center justify-center rounded bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
          @click="$emit('add', item.id)"
        >
          +
        </button>
      </div>
      <span class="text-xs font-medium text-gray-400">{{ t('shop.inStock') }} {{ item.quantity }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { ShopItem } from '@/modules/Shop/types';

import InventoryItem from '@/components/InventoryItem.vue';

defineProps<{
  item: ShopItem;
  cartQuantity: number;
}>();

defineEmits<{
  (e: 'add', id: number): void;
  (e: 'remove', id: number): void;
}>();

const { t } = useTranslation();
</script>
