<template>
  <section class="flex h-full max-h-full min-w-[380px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold text-gray-800">{{ t(blocks[activeBlockIndex].titleKey) }}</h2>
        <div class="flex gap-1">
          <button
            @click="prevBlock"
            class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            @click="nextBlock"
            class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div class="flex gap-1.5">
        <span
          v-for="(_, idx) in blocks"
          :key="idx"
          class="h-2 w-2 rounded-full transition-colors duration-300"
          :class="activeBlockIndex === idx ? 'bg-blue-500' : 'bg-gray-300'"
        ></span>
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-center">
      <div v-if="activeBlockIndex === 0" class="relative flex items-center justify-center py-4">
        <div
          class="relative z-10 grid gap-4"
          style="
            grid-template-areas:
              '. head .'
              'left-hand body right-hand'
              'hands legs feet'
              'accessory . .';
          "
        >
          <div
            v-for="slot in equipmentSlots"
            :key="slot.id"
            :style="{ gridArea: slot.id }"
            class="relative flex h-24 w-24 flex-col items-center justify-center"
            @dragover.prevent
            @dragenter.prevent="$emit('slot-enter', slot.id)"
            @dragleave="$emit('slot-leave')"
            @drop.prevent="$emit('slot-drop', slot.id)"
          >
            <InventoryItem
              :item="
                slot.item
                  ? {
                      ...slot.item,
                      name: t(slot.item.nameKey),
                      rarity: slot.item.rarityKey ? t(slot.item.rarityKey) : undefined,
                    }
                  : null
              "
              :slot-id="slot.id"
              :is-hovered="hoveredSlot === slot.id"
              :empty-icon="emptyIcons[slot.id]"
              :empty-label="t(slot.labelKey)"
              class="h-full w-full"
              @drag-start="$emit('equipment-drag-start', slot.id)"
              @drag-end="$emit('drag-end')"
              @drop="$emit('slot-drop', slot.id)"
            />

            <QBtn
              v-if="slot.item"
              flat
              dense
              round
              icon="close"
              size="xs"
              class="absolute -top-2 -right-2 z-20 bg-white text-gray-400 shadow-md hover:text-red-500"
              @click="$emit('unequip', slot.id)"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeBlockIndex === 1">
        <QCard class="rounded-lg bg-white p-5 shadow-sm">
          <div class="grid grid-cols-1 gap-3 text-sm">
            <div v-for="stat in stats" :key="stat.key" class="flex justify-between border-b border-gray-100 pb-2">
              <span class="text-gray-500">{{ t(stat.labelKey) }}</span>
              <span class="font-bold text-gray-800">{{ stat.value }}</span>
            </div>
          </div>
        </QCard>
      </div>

      <div v-else-if="activeBlockIndex === 2">
        <QCard class="rounded-lg bg-white p-5 shadow-sm">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div
              v-for="info in statsInfo"
              :key="info.key"
              class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-3"
            >
              <span class="mb-1 text-xl font-bold text-blue-600">{{ info.value }}</span>
              <span class="text-center text-[10px] font-medium tracking-wider text-gray-500 uppercase">{{
                t(info.labelKey)
              }}</span>
            </div>
          </div>
        </QCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QCard, QBtn } from 'quasar';
import { ref } from 'vue';

import type { EquipmentSlot, StatItem, StatInfoItem } from '@/modules/Inventory/types';

import InventoryItem from '@/components/InventoryItem.vue';

defineProps<{
  equipmentSlots: EquipmentSlot[];
  stats: StatItem[];
  statsInfo: StatInfoItem[];
  hoveredSlot: string | null;
}>();

defineEmits<{
  (e: 'slot-enter', id: string): void;
  (e: 'slot-leave'): void;
  (e: 'slot-drop', id: string): void;
  (e: 'unequip', id: string): void;
  (e: 'equipment-drag-start', id: string): void; // <-- Добавили
  (e: 'drag-end'): void;
}>();

const { t } = useTranslation();
const activeBlockIndex = ref(0);

const blocks = [
  { titleKey: 'profile.equipment' },
  { titleKey: 'profile.characteristics' },
  { titleKey: 'profile.statistics' },
];

const emptyIcons: Record<string, string> = {
  head: 'face',
  body: 'checkroom',
  'left-hand': 'front_hand',
  'right-hand': 'security',
  hands: 'pan_tool',
  legs: 'accessibility_new',
  feet: 'directions_walk',
  accessory: 'diamond',
};

const nextBlock = () => {
  activeBlockIndex.value = (activeBlockIndex.value + 1) % blocks.length;
};

const prevBlock = () => {
  activeBlockIndex.value = (activeBlockIndex.value - 1 + blocks.length) % blocks.length;
};
</script>
