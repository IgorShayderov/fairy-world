<template>
  <article class="shop-product-card">
    <div class="flex justify-center">
      <InventoryItem
        :item="{
          name: itemTypeName,
          nameKey: itemTypeName,
          tooltipName: item.name,
          level: item.level,
          requiredPlayerLevel: item.requiredPlayerLevel ?? 1,
          icon: item.icon,
          description: item.description,
          price: item.price,
          rarity: t(`profile.rarity.${item.rarity.toLowerCase()}`),
          rarityKey: item.rarity,
          equipmentType: item.equipmentType,
          attributes: item.attributes,
          properties: item.properties,
        }"
        :comparison-item="item.equipmentType.includes('RECIPE') ? null : equippedItem"
        :slot-id="''"
        class="shop-product-icon"
        @double-click="$emit('add', item.id)"
      />
    </div>

    <div class="flex items-center justify-between gap-3">
      <span class="shop-product-name min-w-0 truncate font-bold">
        {{ itemTypeName }}
      </span>
      <span class="shop-product-price shrink-0 text-lg font-bold"> {{ item.price }}g </span>
    </div>

    <p class="shop-product-description text-sm">
      <span class="shop-product-rarity font-semibold" :data-rarity="item.rarity">{{ rarityName }}</span>
      <span v-if="description" class="ml-1">{{ description }}</span>
    </p>

    <div class="shop-product-footer mt-auto flex items-center justify-between pt-3">
      <div class="shop-product-quantity">
        <QBtn
          flat
          dense
          round
          icon="remove"
          size="sm"
          :aria-label="`Remove ${item.name} from cart`"
          :disable="cartQuantity === 0"
          @click="$emit('remove', item.id)"
        />

        <span class="min-w-[32px] text-center text-sm font-medium">
          {{ cartQuantity }}
        </span>

        <QBtn
          flat
          dense
          round
          icon="add"
          size="sm"
          :aria-label="`Add ${item.name} to cart`"
          :disable="cartQuantity >= item.quantity"
          @click="$emit('add', item.id)"
        />
      </div>

      <span class="shop-product-stock text-xs font-medium"> {{ t('shop.inStock') }} {{ item.quantity }} </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QBtn } from 'quasar';
import { computed } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';
import type { ShopItem } from '@/modules/Shop/types';

import { removeRarityPrefix } from '@/modules/Inventory/utils/rarity';
import { getItemTypeLocaleKey } from '@/modules/Shop/utils/itemPresentation';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{
  item: ShopItem;
  cartQuantity: number;
  equippedItem: InventoryItemType | null;
}>();

defineEmits<{
  (e: 'add', id: number): void;
  (e: 'remove', id: number): void;
}>();

const { t } = useTranslation();
const itemTypeName = computed(() => t(getItemTypeLocaleKey(props.item.equipmentType, props.item.name)));
const rarityName = computed(() => t(`profile.rarity.${props.item.rarity.toLowerCase()}`));
const description = computed(() => removeRarityPrefix(props.item.description, props.item.rarity) || '—');
</script>

<style scoped>
.shop-product-card {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  min-width: 0;
  gap: 12px;
  padding: 18px;
  border: 1px solid #bca26955;
  border-radius: 14px;
  background: linear-gradient(130deg, #1c4148, #0b202b);
  color: #d8e6e3;
  transition: border-color 160ms ease;
}
.shop-product-card:hover,
.shop-product-card:focus-within {
  border-color: #d8bd76;
}
/* Important base-layer rules outrank the shared item's important utility styles. */
@layer base {
  .shop-product-icon {
    width: 96px;
    height: 96px;
    flex: 0 0 96px;
    border: 1px solid #a3bec15c !important;
    background: #0b202b !important;
    box-shadow: inset 0 1px 12px #00000026 !important;
  }
  .shop-product-icon :deep(.q-icon),
  .shop-product-icon :deep(svg) {
    color: #c0d4d2 !important;
  }
}
.shop-product-name {
  color: #f2d897;
}
.shop-product-price {
  color: #efd087;
}
.shop-product-description {
  color: #c0d4d2;
  line-height: 1.6;
  margin: 0;
}
.shop-product-rarity {
  color: #c0d4d2;
}
.shop-product-rarity[data-rarity='MAGIC'] {
  color: #92c7f8;
}
.shop-product-rarity[data-rarity='RARE'] {
  color: #d4b3f4;
}
.shop-product-rarity[data-rarity='UNIQUE'] {
  color: #ffbe8a;
}
.shop-product-rarity[data-rarity='QUEST'] {
  color: #f0d387;
}
.shop-product-footer {
  border-top: 1px solid #a3bec12b;
  gap: 10px;
}
.shop-product-quantity {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid #a3bec145;
  border-radius: 8px;
  background: #091d27;
  color: #f2d897;
}
.shop-product-quantity :deep(.q-btn) {
  color: #f2d897;
}
.shop-product-quantity :deep(.q-btn:focus-visible) {
  outline: 2px solid #efd087;
  outline-offset: 2px;
}
.shop-product-stock {
  color: #a9c3c5;
}
@media (prefers-reduced-motion: reduce) {
  .shop-product-card {
    transition: none;
  }
}
</style>
