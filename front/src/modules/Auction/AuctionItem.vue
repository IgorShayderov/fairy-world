<template>
  <div class="auction-item" @dragstart.prevent>
    <InventoryItem :item="displayItem" :comparison-item="comparison" slot-id="" class="auction-item-icon" />
    <div class="min-w-0">
      <h3>
        {{ entry.item.name }}<span v-if="entry.quantity > 1"> ×{{ entry.quantity }}</span>
      </h3>
      <p class="auction-muted">{{ entry.item.rarity }} · Item level {{ entry.item.level ?? 1 }}</p>
      <p :class="eligible ? 'auction-muted' : 'auction-warning'">
        Requires player level {{ entry.item.requiredPlayerLevel ?? 1 }}
      </p>
      <p v-if="entry.upgradeType && entry.upgradeValue" class="auction-upgrade">
        +{{ entry.upgradeValue }} {{ entry.upgradeType.toLowerCase() }} upgrade
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

import type { InventoryEntry, InventoryItemType } from '@/modules/Inventory/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { findEquippedItemForEntries } from '@/modules/Inventory/utils/equipment';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{
  entry: Pick<
    InventoryEntry,
    'item' | 'quantity' | 'upgradeType' | 'upgradeValue' | 'craftUpgradeType' | 'craftUpgradeValue'
  >;
}>();
const currentUser = useCurrentUserStore();
const displayItem = computed<InventoryItemType>(() => ({
  ...props.entry.item,
  nameKey: props.entry.item.name,
  quantity: props.entry.quantity,
  upgradeType: props.entry.upgradeType ?? null,
  upgradeValue: props.entry.upgradeValue ?? null,
  craftUpgradeType: props.entry.craftUpgradeType ?? null,
  craftUpgradeValue: props.entry.craftUpgradeValue ?? null,
}));
const eligible = computed(() => (currentUser.user?.level ?? 1) >= (props.entry.item.requiredPlayerLevel ?? 1));
const comparison = computed(() => findEquippedItemForEntries(currentUser.user?.equippedItems ?? [], props.entry.item));
</script>
