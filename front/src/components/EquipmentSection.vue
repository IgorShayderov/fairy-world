<template>
  <section class="flex min-h-[460px] min-w-[380px] flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
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
      <div v-if="activeBlockIndex === 0" class="relative flex items-center justify-center py-2">
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-15">
          <svg class="h-72 w-72 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 2a3 3 0 0 0-3 3c0 .7.25 1.35.7 1.85L8 14H6l-2 6h3l1-4h4l1 4h3l-2-6h-2l-1.7-7.15c.45-.5.7-1.15.7-1.85a3 3 0 0 0-3-3m0 2a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1Z"
            />
          </svg>
        </div>

        <div
          class="relative z-10 grid grid-cols-3 grid-rows-4 justify-items-center gap-3 [grid-template-areas:'left-hand_head_right-hand'_'left-hand_body_right-hand'_'hands_legs_feet'_'accessory_legs_feet']"
        >
          <div
            v-for="slot in equipmentSlots"
            :key="slot.id"
            :style="{ gridArea: slot.id }"
            :class="[
              'relative flex h-16 w-16 flex-col items-center justify-center rounded-lg border p-2.5 transition-colors duration-200',
              slot.equipped ? 'border-gray-300 bg-white shadow-sm' : 'border-dashed border-gray-300 bg-gray-100/80',
            ]"
            @dragover.prevent
            @dragenter.prevent="$emit('slot-enter', slot.id)"
            @dragleave="$emit('slot-leave')"
            @drop.prevent="$emit('slot-drop', slot.id)"
          >
            <span class="absolute top-0.5 left-1 text-[9px] font-semibold text-gray-400 uppercase">{{
              t(slot.labelKey)
            }}</span>

            <InventoryItem
              v-if="slot.item"
              :item="{
                ...slot.item,
                name: t(slot.item.nameKey),
                rarity: slot.item.rarityKey ? t(slot.item.rarityKey) : undefined,
              }"
              :slot-id="slot.id"
              :is-hovered="hoveredSlot === slot.id"
              :is-dragging="false"
              @drop="$emit('slot-drop', slot.id)"
            />

            <QBtn
              v-if="slot.item"
              flat
              dense
              round
              icon="close"
              size="xs"
              class="absolute -top-1 -right-1 bg-white text-gray-400 shadow-sm hover:text-red-500"
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

import type { EquipmentSlot, StatItem, StatInfoItem } from '@/shared/types/inventory';

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
}>();

const { t } = useTranslation();

const activeBlockIndex = ref(0);
const blocks = [
  { titleKey: 'profile.equipment' },
  { titleKey: 'profile.characteristics' },
  { titleKey: 'profile.statistics' },
];

const nextBlock = () => {
  activeBlockIndex.value = (activeBlockIndex.value + 1) % blocks.length;
};

const prevBlock = () => {
  activeBlockIndex.value = (activeBlockIndex.value - 1 + blocks.length) % blocks.length;
};
</script>
