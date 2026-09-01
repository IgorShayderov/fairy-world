<template>
  <section class="flex h-full max-h-full w-[400px] shrink-0 flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <SectionNavigation
      :title="t(currentBlock.titleKey)"
      :total-pages="blocks.length"
      :current-index="currentBlockIndex"
      @prev="prevBlock"
      @next="nextBlock"
    />

    <div class="flex w-full flex-1 flex-col justify-center">
      <div v-if="activeBlockKey === 'equipment'" class="relative flex w-full items-center justify-center">
        <div
          class="relative z-10 grid gap-4"
          style="
            grid-template-areas:
              '. head .'
              'left-hand body right-hand'
              'hands legs feet'
              'accessory scroll potion';
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

      <div v-else-if="activeBlockKey === 'characteristics'" class="w-full">
        <QCard class="w-full rounded-lg bg-white p-5 shadow-sm">
          <div class="grid grid-cols-1 gap-3 text-sm">
            <div v-for="attr in attributes" :key="attr.key" class="flex justify-between border-b border-gray-100 pb-2">
              <span class="text-gray-500">{{ t(`profile.stats.${attr.key}`) }}</span>
              <span class="font-bold text-gray-800">{{ attr.value }}</span>
            </div>
          </div>
        </QCard>
      </div>

      <div v-else-if="activeBlockKey === 'statistics'" class="w-full">
        <QCard class="w-full rounded-lg bg-white p-5 shadow-sm">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div
              v-for="stat in stats"
              :key="stat.key"
              class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-3"
            >
              <span class="mb-1 text-xl font-bold text-blue-600">{{ stat.value }}</span>
              <span class="text-center text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                {{ t(`profile.statsInfo.${stat.key}`) }}
              </span>
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
import { ref, computed } from 'vue';

import type { Component } from 'vue';
import type { StatItem, StatInfoItem, EquipmentSlot } from '@/modules/Inventory/types';

import BodyArmorIcon from './icons/BodyArmorIcon.vue';
import BootsIcon from './icons/BootsIcon.vue';
import GlovesIcon from './icons/GlovesIcon.vue';
import HelmetIcon from './icons/HelmetIcon.vue';
import LegsArmorIcon from './icons/LegsArmorIcon.vue';
import PotionIcon from './icons/PotionIcon.vue';
import RingIcon from './icons/RingIcon.vue';
import ScrollIcon from './icons/ScrollIcon.vue';
import ShieldIcon from './icons/ShieldIcon.vue';
import WeaponIcon from './icons/WeaponIcon.vue';
import InventoryItem from './InventoryItem.vue';

import SectionNavigation from '@/shared/components/SectionNavigation.vue';

defineProps<{
  equipmentSlots: EquipmentSlot[];
  hoveredSlot: string | null;
}>();

defineEmits<{
  (e: 'slot-enter', id: string): void;
  (e: 'slot-leave'): void;
  (e: 'slot-drop', id: string): void;
  (e: 'unequip', id: string): void;
  (e: 'equipment-drag-start', id: string): void;
  (e: 'drag-end'): void;
}>();

const attributes = ref<StatItem[]>([
  { key: 'hp', value: 0 },
  { key: 'mp', value: 0 },
  { key: 'atk', value: 0 },
  { key: 'def', value: 0 },
  { key: 'spd', value: 0 },
]);

const stats = ref<StatInfoItem[]>([
  { key: 'games', value: 0 },
  { key: 'monsters', value: 0 },
  { key: 'bosses', value: 0 },
  { key: 'deaths', value: 0 },
]);

const { t } = useTranslation();

const blocks = [
  { key: 'equipment', titleKey: 'profile.equipment' },
  { key: 'characteristics', titleKey: 'profile.characteristics' },
  { key: 'statistics', titleKey: 'profile.statistics' },
] as const;

type BlockKey = (typeof blocks)[number]['key'];
const activeBlockKey = ref<BlockKey>('equipment');
const currentBlockIndex = computed(() => {
  return blocks.findIndex((b) => b.key === activeBlockKey.value);
});

const currentBlock = computed(() => {
  return blocks.find((b) => b.key === activeBlockKey.value) || blocks[0];
});

const emptyIcons: Record<string, Component | string> = {
  head: HelmetIcon,
  body: BodyArmorIcon,
  'left-hand': WeaponIcon,
  'right-hand': ShieldIcon,
  hands: GlovesIcon,
  legs: LegsArmorIcon,
  feet: BootsIcon,
  accessory: RingIcon,
  scroll: ScrollIcon,
  potion: PotionIcon,
};

const nextBlock = () => {
  const currentIndex = blocks.findIndex((b) => b.key === activeBlockKey.value);
  const nextIndex = (currentIndex + 1) % blocks.length;
  activeBlockKey.value = blocks[nextIndex].key;
};

const prevBlock = () => {
  const currentIndex = blocks.findIndex((b) => b.key === activeBlockKey.value);
  const prevIndex = (currentIndex - 1 + blocks.length) % blocks.length;
  activeBlockKey.value = blocks[prevIndex].key;
};
</script>
