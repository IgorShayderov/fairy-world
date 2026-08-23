<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Заголовок -->
    <header class="bg-gray-800 text-white px-4 py-2 flex items-center gap-4">
      <h1 class="text-lg font-semibold">Профиль</h1>
      <QBtn flat dense round icon="account_circle" />
    </header>

    <!-- Основной контент -->
    <main class="flex-1 p-4 overflow-auto">
      <!-- Инвентарь -->
      <section class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-3">Инвентарь</h2>
        <div class="grid grid-cols-6 gap-3">
          <div
            v-for="(item, idx) in inventory"
            :key="idx"
            class="inventory-slot"
            :class="{ 'border-blue-400 bg-blue-50': item }"
          >
            <template v-if="item">
              <div class="flex flex-col items-center text-xs">
                <QIcon :name="item.icon" size="32px" class="text-gray-700" />
                <span class="mt-1 truncate w-full text-center">{{ item.name }}</span>
              </div>
            </template>
            <template v-else>
              <QIcon name="inventory_2" size="32px" class="text-gray-300" />
            </template>
          </div>
        </div>
      </section>

      <!-- Экипировка (одетые предметы) -->
      <section class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-3">Экипировка</h2>
        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="slot in equipmentSlots"
            :key="slot.id"
            class="q-pa-md q-card q-card--dark rounded-borders"
            :class="slot.equipped ? 'bg-gray-100' : 'bg-gray-50'"
          >
            <div class="text-sm font-medium text-gray-600 mb-2">{{ slot.label }}</div>
            <div v-if="slot.equipped" class="flex items-center gap-2">
              <QIcon :name="slot.item.icon" size="28px" class="text-gray-700" />
              <QCard class="flex-1 q-px-none q-py-xs">
                <div class="text-sm">{{ slot.item.name }}</div>
                <div class="text-xs text-gray-500">{{ slot.item.rarity }}</div>
              </QCard>
              <QBtn flat dense round icon="close" size="sm" @click="unequip(slot.id)" />
            </div>
            <template v-else>
              <QIcon name="inventory_2" size="28px" class="text-gray-300 mx-auto" />
              <QBtn flat dense class="mt-1 text-xs text-blue-600">Экипировать</QBtn>
            </template>
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
import { QCard, QBtn, QIcon } from 'quasar';

interface InventoryItem {
  name: string;
  icon: string;
}

interface EquippedItem {
  name: string;
  icon: string;
  rarity: string;
}

const inventory = ref<InventoryItem[]>([
  { name: 'Меч', icon: 'firearms' },
  { name: 'Щит', icon: 'shield' },
  { name: 'Лекаство', icon: 'medication' },
  { name: 'Зелье', icon: 'water' },
  { name: 'Кольцо', icon: 'rings' },
  { name: 'Свиток', icon: 'menu_book' },
  { name: 'Кристалл', icon: 'search' },
  { name: 'Посох', icon: 'science' },
]);

const equipmentSlots = ref([
  { id: 'head', label: 'Голова', equipped: true, item: { name: 'Шлем', icon: 'security', rarity: 'Редкий' } },
  { id: 'body', label: 'Тело', equipped: true, item: { name: 'Доспехи', icon: 'security', rarity: 'Обычный' } },
  { id: 'hands', label: 'Руки', equipped: true, item: { name: 'Перчатки', icon: 'pan_tool', rarity: 'Обычный' } },
  { id: 'legs', label: 'Ноги', equipped: false, item: null },
  { id: 'feet', label: 'Обувь', equipped: true, item: { name: 'Ботинки', icon: 'directions_walk', rarity: 'Редкий' } },
  { id: 'accessory', label: 'Аксессуар', equipped: true, item: { name: 'Кольцо', icon: 'stars', rarity: 'Легендарный' } },
]);

const stats = ref([
  { key: 'hp', label: 'HP', value: 120 },
  { key: 'mp', label: 'MP', value: 60 },
  { key: 'atk', label: 'Атака', value: 18 },
  { key: 'def', label: 'Защита', value: 12 },
  { key: 'spd', label: 'Скорость', value: 8 },
]);

const unequip = (slotId: string) => {
  const slot = equipmentSlots.value.find(s => s.id === slotId);
  if (slot) {
    slot.equipped = false;
    slot.item = null;
  }
};
</script>

<style lang="scss" scoped>
.inventory-slot {
  aspect-ratio: 1 / 1;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: #9ca3af;
  }
}
</style>
