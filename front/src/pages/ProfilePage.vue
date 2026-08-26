<template>
  <div class="flex min-h-0 flex-1 flex-col bg-gray-50">
    <main class="flex flex-1 items-start justify-center gap-6 overflow-auto p-6">
      <InventorySection
        :inventory="inventory"
        :drag-index="dragItemIndex"
        :is-hovered="isHoveredSlot"
        @drag-start="onInventoryDragStart"
        @drag-end="onInventoryDragEnd"
      />

      <EquipmentSection
        :equipment-slots="equipmentSlots"
        :stats="stats"
        :stats-info="statsInfo"
        :hovered-slot="isHoveredSlot"
        @slot-enter="(id) => (isHoveredSlot = id)"
        @slot-leave="isHoveredSlot = null"
        @slot-drop="onSlotDrop"
        @unequip="unequip"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import InventorySection from '@/components/InventorySection.vue';
import EquipmentSection from '@/components/EquipmentSection.vue';
import type { InventoryItemType, EquipmentSlot, StatItem, StatInfoItem } from '@/shared/types/inventory';

const inventory = ref<InventoryItemType[]>([
  { nameKey: 'profile.items.sword', icon: 'firearms', rarityKey: 'profile.rarity.rare' },
  { nameKey: 'profile.items.shield', icon: 'shield', rarityKey: 'profile.rarity.common' },
  { nameKey: 'profile.items.medicine', icon: 'medication' },
  { nameKey: 'profile.items.potion', icon: 'water' },
  { nameKey: 'profile.items.ring', icon: 'rings', rarityKey: 'profile.rarity.rare' },
  { nameKey: 'profile.items.scroll', icon: 'menu_book' },
  { nameKey: 'profile.items.crystal', icon: 'search', rarityKey: 'profile.rarity.legendary' },
  { nameKey: 'profile.items.staff', icon: 'science' },
]);

// Идентификаторы слотов соответствуют grid-area в CSS Diablo-сетки
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

// Логика Drag & Drop
const dragItem = ref<InventoryItemType | null>(null);
const dragItemIndex = ref<number | null>(null);
const isHoveredSlot = ref<string | null>(null);

const onInventoryDragStart = (idx: number) => {
  const item = inventory.value[idx];
  if (item) {
    dragItem.value = item;
    dragItemIndex.value = idx;
  }
};

const onInventoryDragEnd = () => {
  dragItem.value = null;
  dragItemIndex.value = null;
  isHoveredSlot.value = null;
};

const onSlotDrop = (slotId: string) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);
  if (!slot) return;

  if (slot.item) {
    if (dragItemIndex.value !== null) {
      inventory.value.splice(dragItemIndex.value, 1, slot.item);
      dragItemIndex.value = null;
    } else {
      inventory.value.push(slot.item);
    }
    slot.item = null;
  }

  if (dragItem.value) {
    slot.item = dragItem.value;
    slot.equipped = true;
    if (dragItemIndex.value !== null) {
      inventory.value.splice(dragItemIndex.value, 1);
    }
  }

  dragItem.value = null;
  dragItemIndex.value = null;
  isHoveredSlot.value = null;
};

const unequip = (slotId: string) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);
  if (slot && slot.item) {
    inventory.value.push(slot.item);
    slot.item = null;
    slot.equipped = false;
  }
};
</script>
