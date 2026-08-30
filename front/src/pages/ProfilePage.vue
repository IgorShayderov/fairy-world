<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
    <div class="flex h-full w-full flex-row items-stretch justify-center gap-8 overflow-y-auto p-6">
      <EquipmentSection
        class="shrink-0"
        :equipment-slots="equipmentSlots"
        :stats="stats"
        :stats-info="statsInfo"
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
import { ref } from 'vue';

import type { InventoryItemType, EquipmentSlot, StatItem, StatInfoItem } from '@/shared/types/inventory';

import EquipmentSection from '@/components/EquipmentSection.vue';
import InventorySection from '@/components/InventorySection.vue';

const inventory = ref<(InventoryItemType | null)[]>([
  { nameKey: 'profile.items.sword', icon: 'firearms', rarityKey: 'profile.rarity.rare' },
  { nameKey: 'profile.items.shield', icon: 'shield', rarityKey: 'profile.rarity.common' },
  { nameKey: 'profile.items.medicine', icon: 'medication' },
  { nameKey: 'profile.items.potion', icon: 'water' },
  { nameKey: 'profile.items.ring', icon: 'stars', rarityKey: 'profile.rarity.rare' },
  { nameKey: 'profile.items.scroll', icon: 'menu_book' },
  { nameKey: 'profile.items.crystal', icon: 'search', rarityKey: 'profile.rarity.legendary' },
  { nameKey: 'profile.items.staff', icon: 'science' },
  null, // Slot 9
  null, // Slot 10
  null, // Slot 11
  null, // Slot 12
]);

const equipmentSlots = ref<EquipmentSlot[]>([
  {
    id: 'head',
    labelKey: 'profile.slots.head',
    item: { nameKey: 'profile.items.helmet', icon: 'security', rarityKey: 'profile.rarity.rare' },
    equipped: true,
  },
  {
    id: 'body',
    labelKey: 'profile.slots.body',
    item: { nameKey: 'profile.items.armor', icon: 'security', rarityKey: 'profile.rarity.common' },
    equipped: true,
  },
  {
    id: 'left-hand',
    labelKey: 'profile.slots.leftHand',
    item: { nameKey: 'profile.items.sword', icon: 'firearms', rarityKey: 'profile.rarity.rare' },
    equipped: true,
  },
  {
    id: 'right-hand',
    labelKey: 'profile.slots.rightHand',
    item: { nameKey: 'profile.items.shield', icon: 'shield', rarityKey: 'profile.rarity.common' },
    equipped: true,
  },
  {
    id: 'hands',
    labelKey: 'profile.slots.hands',
    item: { nameKey: 'profile.items.gloves', icon: 'pan_tool', rarityKey: 'profile.rarity.common' },
    equipped: true,
  },
  { id: 'legs', labelKey: 'profile.slots.legs', item: null, equipped: false },
  {
    id: 'feet',
    labelKey: 'profile.slots.feet',
    item: { nameKey: 'profile.items.boots', icon: 'directions_walk', rarityKey: 'profile.rarity.rare' },
    equipped: true,
  },
  {
    id: 'accessory',
    labelKey: 'profile.slots.accessory',
    item: { nameKey: 'profile.items.ring', icon: 'stars', rarityKey: 'profile.rarity.legendary' },
    equipped: true,
  },
]);

const stats = ref<StatItem[]>([
  { key: 'hp', labelKey: 'profile.stats.hp', value: 120 },
  { key: 'mp', labelKey: 'profile.stats.mp', value: 60 },
  { key: 'atk', labelKey: 'profile.stats.atk', value: 18 },
  { key: 'def', labelKey: 'profile.stats.def', value: 12 },
  { key: 'spd', labelKey: 'profile.stats.spd', value: 8 },
]);

const statsInfo = ref<StatInfoItem[]>([
  { key: 'games', labelKey: 'profile.statsInfo.gamesPlayed', value: 42 },
  { key: 'monsters', labelKey: 'profile.statsInfo.monstersKilled', value: 1337 },
  { key: 'bosses', labelKey: 'profile.statsInfo.bossesDefeated', value: 5 },
  { key: 'deaths', labelKey: 'profile.statsInfo.deaths', value: 12 },
]);

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
  // 1. Тащим из инвентаря в инвентарь (Меняем местами)
  if (dragItemIndex.value !== null && dragItemIndex.value !== targetIndex) {
    const temp = inventory.value[targetIndex];
    inventory.value[targetIndex] = inventory.value[dragItemIndex.value];
    inventory.value[dragItemIndex.value] = temp;
  }
  // 2. Тащим из экипировки в инвентарь (Меняем местами предмет из экипировки и слот инвентаря)
  else if (dragEquipmentSlotId.value !== null) {
    const slot = equipmentSlots.value.find((s) => s.id === dragEquipmentSlotId.value);
    if (slot && slot.item) {
      const itemInInventory = inventory.value[targetIndex];

      inventory.value[targetIndex] = slot.item; // Кладем в инвентарь вещь со слота

      slot.item = itemInInventory; // Надеваем то, что было в инвентаре (если там было пусто, слот очистится)
      slot.equipped = !!itemInInventory;
    }
  }

  onDragEnd();
};

const onSlotDrop = (slotId: string) => {
  const targetSlot = equipmentSlots.value.find((s) => s.id === slotId);
  if (!targetSlot) return;

  const itemFromEquipment = targetSlot.item;

  // 1. Бросили предмет из инвентаря в экипировку
  if (dragItem.value && dragItemIndex.value !== null) {
    targetSlot.item = dragItem.value;
    targetSlot.equipped = true;
    inventory.value[dragItemIndex.value] = itemFromEquipment;
  }
  // 2. Бросили предмет из одного слота экипировки в другой (бонус: теперь тоже работает!)
  else if (dragItem.value && dragEquipmentSlotId.value !== null && dragEquipmentSlotId.value !== slotId) {
    const sourceSlot = equipmentSlots.value.find((s) => s.id === dragEquipmentSlotId.value);
    if (sourceSlot) {
      sourceSlot.item = itemFromEquipment;
      sourceSlot.equipped = !!itemFromEquipment;

      targetSlot.item = dragItem.value;
      targetSlot.equipped = true;
    }
  }

  onDragEnd();
};

const unequip = (slotId: string) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);

  if (slot && slot.item) {
    const emptyIndex = inventory.value.findIndex((item) => item === null);

    if (emptyIndex !== -1) {
      inventory.value[emptyIndex] = slot.item;
      slot.item = null;
      slot.equipped = false;
    } else {
      console.warn('Инвентарь полон! Нет места для снятия предмета.');
    }
  }
};
</script>
