<template>
  <div
    class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="flex justify-center">
      <InventoryItem
        :item="{
          name: itemTypeName,
          nameKey: itemTypeName,
          tooltipName: item.name,
          icon: item.icon,
          description: item.description,
          price: item.price,
          rarity: t(`profile.rarity.${item.rarity.toLowerCase()}`),
          equipmentType: item.equipmentType,
          attributes: item.attributes,
          properties: item.properties,
        }"
        :slot-id="''"
        class="h-24 w-24 shrink-0"
      />
    </div>

    <div class="flex items-center justify-between gap-3">
      <span class="min-w-0 truncate font-bold text-gray-800">
        {{ itemTypeName }}
      </span>
      <span class="shrink-0 text-lg font-bold text-green-600"> {{ item.price }}g </span>
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
import { computed } from 'vue';

import type { ShopItem } from '@/modules/Shop/types';

import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{
  item: ShopItem;
  cartQuantity: number;
}>();

defineEmits<{
  (e: 'add', id: number): void;
  (e: 'remove', id: number): void;
}>();

const { t } = useTranslation();
const itemTypeName = computed(() => t(getItemTypeLocaleKey(props.item.equipmentType)));
</script>
