<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Заголовок -->
    <header class="bg-gray-800 text-white px-4 py-2 flex items-center gap-4">
      <h1 class="text-lg font-semibold">Профиль</h1>
      <QBtn flat dense round icon="account_circle" />
    </header>

    <!-- Основной контент -->
    <main class="flex-1 p-4 overflow-auto">
      <!-- Инвентарь (drag-n-drop: тащить предмет из инвентаря в слот экипировки) -->
      <section class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-3">Инвентарь</h2>
        <div class="grid grid-cols-6 gap-3">
          <InventoryItem
            v-for="(item, idx) in inventory"
            :key="idx"
            :item="item"
            :is-hovered="isHoveredSlot === null"
            :is-dragging="dragItem === item"
            @drag-start="onInventoryDragStart(idx)"
            @drag-end="onInventoryDragEnd"
          />
        </div>
      </section>

      <!-- Экипировка (drop-слоты: голова, тело, руки, ноги, обувь, аксессуар) -->
      <section class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-3">Экипировка</h2>
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="slot in equipmentSlots"
            :key="slot.id"
            :class="['rounded-borders', slot.equipped ? 'bg-gray-100 q-pa-md' : 'bg-gray-50 q-pa-md']"
            @dragover.prevent="onSlotDragOver()"
            @dragenter.prevent="isHoveredSlot = slot.id"
            @dragleave="isHoveredSlot = null"
            @drop.prevent="onSlotDrop(slot.id)"
          >
            <div class="text-sm font-medium text-gray-600 mb-2">{{ slot.label }}</div>
            <InventoryItem
              :item="slot.item"
              :slot-id="slot.id"
              :is-hovered="isHoveredSlot === slot.id"
              :is-dragging="false"
              @drop="onSlotDrop(slot.id)"
            />
            <!-- Кнопка снять предмет -->
            <QBtn
              v-if="slot.item"
              flat
              dense
              round
              icon="close"
              size="sm"
              class="absolute top-1 right-1"
              @click="unequip(slot.id)"
            />
          </div>
        </div>
      </section>

      <!-- Статистика персонажа -->
      <section>
        <h2 class="text-xl font-bold text-gray-800 mb-3">Характеристики</h2>
        <QCard class="q-pa-md">
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div v-for="stat in stats" :key="stat.key" class="flex justify-between">
              <span class="text-gray-600">{{ stat.label }}</span>
              <span class="font-semibold">{{ stat.value }}</span>
            </div>
          </div>
        </QCard>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QCard, QBtn } from 'quasar';
import InventoryItem from '@/components/InventoryItem.vue';
import type { InventoryItem as IInventoryItem, EquipmentSlot } from '@/shared/types/inventory';

const inventory = ref<IInventoryItem[]>([
  { name: 'Меч', icon: 'firearms', rarity: 'Редкий' },
  { name: 'Щит', icon: 'shield', rarity: 'Обычный' },
  { name: 'Лекаство', icon: 'medication' },
  { name: 'Зелье', icon: 'water' },
  { name: 'Кольцо', icon: 'rings', rarity: 'Редкий' },
  { name: 'Свиток', icon: 'menu_book' },
  { name: 'Кристалл', icon: 'search', rarity: 'Легендарный' },
  { name: 'Посох', icon: 'science' },
]);

const equipmentSlots = ref<EquipmentSlot[]>([
  { id: 'head', label: 'Голова', item: { name: 'Шлем', icon: 'security', rarity: 'Редкий' }, equipped: true },
  { id: 'body', label: 'Тело', item: { name: 'Доспехи', icon: 'security', rarity: 'Обычный' }, equipped: true },
  { id: 'hands', label: 'Руки', item: { name: 'Перчатки', icon: 'pan_tool', rarity: 'Обычный' }, equipped: true },
  { id: 'legs', label: 'Ноги', item: null, equipped: false },
  { id: 'feet', label: 'Обувь', item: { name: 'Ботинки', icon: 'directions_walk', rarity: 'Редкий' }, equipped: true },
  { id: 'accessory', label: 'Аксессуар', item: { name: 'Кольцо', icon: 'stars', rarity: 'Легендарный' }, equipped: true },
]);

const stats = ref([
  { key: 'hp', label: 'HP', value: 120 },
  { key: 'mp', label: 'MP', value: 60 },
  { key: 'atk', label: 'Атака', value: 18 },
  { key: 'def', label: 'Защита', value: 12 },
  { key: 'spd', label: 'Скорость', value: 8 },
]);

// Drag state
const dragItem = ref<IInventoryItem | null>(null);
const dragItemIndex = ref<number | null>(null);
const isHoveredSlot = ref<string | null>(null);

// Инвентарь: начать drag
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

// Экипировка: hover slot
const onSlotDragOver = () => {
  // подсветка — но не меняем isHoveredSlot (это делает dragenter)
};

// Экипировка: drop предмета
const onSlotDrop = (slotId: string) => {
  const slot = equipmentSlots.value.find(s => s.id === slotId);
  if (!slot) return;

  // Если в слоте уже есть предмет — вернуть его в инвентарь (swap)
  if (slot.item) {
    if (dragItemIndex.value !== null) {
      // swap: удаляем старый элемент из инвентаря, добавляем старый предмет слота
      inventory.value.splice(dragItemIndex.value, 1, slot.item);
      dragItemIndex.value = null;
    } else {
      // предмет снят (unequip), просто вернуть в инвентарь
      inventory.value.push(slot.item);
    }
    dragItem.value = null;
  }

  // Экипировать dragged item
  if (dragItem.value) {
    slot.item = dragItem.value;
    slot.equipped = true;
    dragItem.value = null;
    dragItemIndex.value = null;
  }
  isHoveredSlot.value = null;
};

// Снять предмет с экипировки
const unequip = (slotId: string) => {
  const slot = equipmentSlots.value.find(s => s.id === slotId);
  if (slot && slot.item) {
    inventory.value.push(slot.item);
    slot.item = null;
    slot.equipped = false;
  }
};
</script>

<style lang="scss" scoped>
// Дополнительные стили для drag-over подсветки слота
:deep(.q-card) {
  transition: background-color 0.2s, border-color 0.2s;
}
</style>
