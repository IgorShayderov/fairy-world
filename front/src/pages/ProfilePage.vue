<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
    <div class="flex h-full w-full flex-row items-stretch justify-center gap-8 overflow-y-auto p-6">
      <EquipmentSection
        class="shrink-0"
        :equipment-slots="equipmentSlots"
        :hovered-slot="isHoveredSlot"
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { useInventoryStore } from '@/modules/Inventory/store/inventory';

import EquipmentSection from '@/components/EquipmentSection.vue';
import InventorySection from '@/components/InventorySection.vue';

const inventoryStore = useInventoryStore();
// Достаем реактивные переменные
const { inventory, equipmentSlots } = storeToRefs(inventoryStore);

// --- Логика Drag & Drop ---
const dragItem = ref<InventoryItemType | null>(null);
const dragItemIndex = ref<number | null>(null);
const dragEquipmentSlotId = ref<string | null>(null); // Хранит ID слота экипировки
const isHoveredSlot = ref<string | null>(null);

const onInventoryDragStart = (idx: number) => {
  const item = inventory.value[idx];
  if (item) {
    dragItem.value = item;
    dragItemIndex.value = idx;
    dragEquipmentSlotId.value = null; // Сбрасываем альтернативный источник
  }
};

const onEquipmentDragStart = (slotId: string) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);
  if (slot && slot.item) {
    dragItem.value = slot.item;
    dragEquipmentSlotId.value = slotId;
    dragItemIndex.value = null; // Сбрасываем альтернативный источник
  }
};

const onDragEnd = () => {
  dragItem.value = null;
  dragItemIndex.value = null;
  dragEquipmentSlotId.value = null;
  isHoveredSlot.value = null;
};

const onInventoryDrop = (targetIndex: number) => {
  if (dragItemIndex.value !== null && dragItemIndex.value !== targetIndex) {
    inventoryStore.swapInventoryItems(dragItemIndex.value, targetIndex);
  } else if (dragEquipmentSlotId.value !== null) {
    inventoryStore.unequipItem(dragEquipmentSlotId.value, targetIndex);
  }
  onDragEnd();
};

const onSlotDrop = (slotId: string) => {
  if (dragItemIndex.value !== null) {
    inventoryStore.equipItem(dragItemIndex.value, slotId);
  } else if (dragEquipmentSlotId.value !== null && dragEquipmentSlotId.value !== slotId) {
    inventoryStore.swapEquipmentItems(dragEquipmentSlotId.value, slotId);
  }
  onDragEnd();
};

const unequip = (slotId: string) => {
  inventoryStore.unequipItem(slotId);
};
</script>
