<template>
  <div
    class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <InventoryItem
          :item="{
            name: item.name,
            icon: item.icon,
            rarity: t('profile.rarity.common'),
            equipmentType: item.equipmentType,
          }"
          :slot-id="''"
        />

        <span class="font-bold text-gray-800">
          {{ item.name }}
        </span>
      </div>

      <span class="text-lg font-bold text-green-600"> {{ item.price }}g </span>
    </div>

    <p class="text-sm text-gray-500">
      {{ item.description || '—' }}
    </p>

    <div class="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
      <div class="flex items-center gap-1 rounded bg-gray-200/50 p-1">
        <QBtn
          flat
          dense
          round
          icon="remove"
          size="sm"
          color="grey-7"
          :disable="cartQuantity === 0"
          @click="$emit('remove', item.id)"
        />

        <span class="min-w-[40px] text-center text-sm font-medium text-gray-800">
          {{ cartQuantity }}
        </span>

        <QBtn
          flat
          dense
          round
          icon="add"
          size="sm"
          color="grey-7"
          :disable="cartQuantity >= item.quantity"
          @click="$emit('add', item.id)"
        />
      </div>

      <span class="text-xs font-medium text-gray-400"> {{ t('shop.inStock') }} {{ item.quantity }} </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QBtn } from 'quasar';

import type { ShopItem } from '@/modules/Shop/types';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

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
