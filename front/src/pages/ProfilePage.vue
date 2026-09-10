<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
    <div class="flex h-full w-full flex-row items-stretch justify-center gap-8 overflow-y-auto p-6">
      <EquipmentSection
        class="shrink-0"
        :equipment-slots="equipmentSlots"
        :hovered-slot="isHoveredSlot"
        :player-attributes="currentUserStore.user?.attributes ?? []"
        :player-properties="currentUserStore.user?.properties ?? []"
        :player-level="currentUserStore.user?.level ?? 1"
        :player-experience="currentUserStore.user?.experience ?? 0"
        :player-gold="currentUserStore.user?.gold ?? 0"
        :player-free-attributes="currentUserStore.user?.freeAttributes ?? 0"
        @slot-enter="(id) => (isHoveredSlot = id)"
        @slot-leave="isHoveredSlot = null"
        @slot-drop="onSlotDrop"
        @unequip="unequip"
        @equipment-drag-start="onEquipmentDragStart"
        @drag-end="onDragEnd"
      />

      <InventorySection
        class="w-fit shrink-0"
        :inventory="inventory"
        :drag-index="dragItemIndex"
        :is-hovered="isHoveredSlot"
        @drag-start="onInventoryDragStart"
        @drag-end="onDragEnd"
        @inventory-drop="onInventoryDrop"
        @item-double-click="equipFromInventory"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

import type { EquipmentSlotId, InventoryItemType } from '@/modules/Inventory/types';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { useInventoryStore } from '@/modules/Inventory/store/inventory';
import { getCompatibleEquipmentSlots } from '@/modules/Inventory/utils/equipment';

import EquipmentSection from '@modules/Inventory/components/EquipmentSection.vue';
import InventorySection from '@modules/Inventory/components/InventorySection.vue';

const inventoryStore = useInventoryStore();
const currentUserStore = useCurrentUserStore();
const { inventory, equipmentSlots } = storeToRefs(inventoryStore);

const dragItem = ref<InventoryItemType | null>(null);
const dragItemIndex = ref<number | null>(null);
const dragEquipmentSlotId = ref<EquipmentSlotId | null>(null);
const isHoveredSlot = ref<string | null>(null);

onMounted(async () => {
  await currentUserStore.fetchCurrentUser();
  inventoryStore.hydrateInventory(currentUserStore.user?.inventory ?? [], currentUserStore.user?.equippedItems ?? []);
});

const refreshInventory = async () => {
  await currentUserStore.fetchCurrentUser(true);
  inventoryStore.hydrateInventory(currentUserStore.user?.inventory ?? [], currentUserStore.user?.equippedItems ?? []);
};

const onInventoryDragStart = (idx: number) => {
  const item = inventory.value[idx];
  if (item) {
    dragItem.value = item;
    dragItemIndex.value = idx;
    dragEquipmentSlotId.value = null;
  }
};

const onEquipmentDragStart = (slotId: EquipmentSlotId) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);
  if (slot && slot.item) {
    dragItem.value = slot.item;
    dragEquipmentSlotId.value = slotId;
    dragItemIndex.value = null;
  }
};

const onDragEnd = () => {
  dragItem.value = null;
  dragItemIndex.value = null;
  dragEquipmentSlotId.value = null;
  isHoveredSlot.value = null;
};

const onInventoryDrop = async (targetIndex: number) => {
  try {
    if (dragItemIndex.value !== null && dragItemIndex.value !== targetIndex) {
      inventoryStore.swapInventoryItems(dragItemIndex.value, targetIndex);
    } else if (dragEquipmentSlotId.value !== null) {
      await usersApi.unequipItem(dragEquipmentSlotId.value);
      await refreshInventory();
    }
  } finally {
    onDragEnd();
  }
};

const onSlotDrop = async (slotId: EquipmentSlotId) => {
  try {
    if (dragItemIndex.value !== null) {
      const item = inventory.value[dragItemIndex.value];
      if (item?.inventoryItemId) await usersApi.equipItem(item.inventoryItemId, slotId);
    } else if (dragEquipmentSlotId.value !== null && dragEquipmentSlotId.value !== slotId) {
      const source = equipmentSlots.value.find((slot) => slot.id === dragEquipmentSlotId.value)?.item;
      if (source?.inventoryItemId) await usersApi.equipItem(source.inventoryItemId, slotId);
    }
    await refreshInventory();
  } finally {
    onDragEnd();
  }
};

const unequip = async (slotId: EquipmentSlotId) => {
  await usersApi.unequipItem(slotId);
  await refreshInventory();
};

const equipFromInventory = async (inventoryIndex: number) => {
  const item = inventory.value[inventoryIndex];
  if (!item?.inventoryItemId) return;

  const compatibleSlots = getCompatibleEquipmentSlots(item);
  const targetSlot =
    compatibleSlots.find((slotId) => !equipmentSlots.value.find((slot) => slot.id === slotId)?.item) ??
    compatibleSlots[0];
  if (!targetSlot) return;

  await usersApi.equipItem(item.inventoryItemId, targetSlot);
  await refreshInventory();
};
</script>
