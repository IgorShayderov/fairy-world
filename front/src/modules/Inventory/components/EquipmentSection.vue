<template>
  <section class="flex w-[400px] shrink-0 flex-col rounded-xl bg-gray-200 p-5 shadow-inner">
    <SectionNavigation
      :title="t(currentBlock.titleKey)"
      :total-pages="blocks.length"
      :current-index="currentBlockIndex"
      @prev="prevBlock"
      @next="nextBlock"
    />

    <div class="flex w-full flex-1 flex-col justify-start">
      <div
        v-if="activeBlockKey === 'equipment'"
        class="relative flex h-[432px] min-h-[432px] w-full items-center justify-center"
      >
        <div
          class="relative z-10 grid gap-4"
          style="
            grid-template-areas:
              '. head .'
              'left-hand body right-hand'
              'hands legs feet'
              'accessory amulet banner';
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
              :occupied-item="getOccupiedItem(slot.id)"
              :slot-id="slot.id"
              :is-hovered="hoveredSlot === slot.id"
              :disable-tooltip="disableItemTooltips"
              :empty-icon="emptyIcons[slot.id] ?? ''"
              :empty-label="t(slot.labelKey)"
              class="h-full w-full"
              @drag-start="onItemDragStart(slot.id)"
              @drag-end="$emit('drag-end')"
              @double-click="onItemDoubleClick(slot.id)"
            />

            <QBtn
              v-if="slot.item || getOccupiedItem(slot.id)"
              flat
              dense
              round
              icon="close"
              size="xs"
              class="absolute -top-2 -right-2 z-20 bg-white text-gray-400 shadow-md hover:text-red-500"
              @click="onUnequipClick(slot.id)"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeBlockKey === 'characteristics'" class="h-[432px] min-h-[432px] w-full overflow-y-auto">
        <QCard class="min-h-full w-full rounded-lg bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-xs font-bold tracking-wider text-gray-500 uppercase">
              {{ t('profile.tooltip.attributes') }}
            </h3>
            <span class="text-xs font-semibold text-blue-600">
              {{ t('profile.freeAttributes') }}: {{ playerFreeAttributes }}
            </span>
          </div>
          <div class="grid grid-cols-1 gap-3 text-sm">
            <div
              v-for="attribute in playerAttributes"
              :key="attribute.name"
              class="flex cursor-help justify-between border-b border-gray-100 pb-2"
            >
              <span class="text-gray-500">{{ t(`profile.attributeNames.${attribute.name}`) }}</span>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-800">
                  {{ attribute.value }}
                  <small v-if="attribute.equipmentBonus" class="text-green-600">
                    (+{{ attribute.equipmentBonus }} {{ t('profile.fromItems') }})
                  </small>
                </span>
                <QBtn
                  v-if="playerFreeAttributes > 0"
                  dense
                  round
                  unelevated
                  color="primary"
                  icon="add"
                  size="xs"
                  :loading="allocatingAttribute === attribute.name"
                  :disable="playerFreeAttributes < 1 || allocatingAttribute !== null"
                  :aria-label="
                    t('profile.increaseAttribute', { attribute: t(`profile.attributeNames.${attribute.name}`) })
                  "
                  @click.stop="$emit('allocate-attribute', attribute.name)"
                />
              </div>
              <QTooltip class="max-w-xs bg-gray-900 p-3 text-white">
                {{ t(`profile.attributeDescriptions.${attribute.name}`) }}
              </QTooltip>
            </div>
          </div>

          <h3 class="mt-5 mb-3 text-xs font-bold tracking-wider text-gray-500 uppercase">
            {{ t('profile.tooltip.properties') }}
          </h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div
              v-for="property in playerProperties"
              :key="property.name"
              class="flex cursor-help flex-col rounded-lg bg-gray-50 p-3"
            >
              <span class="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                {{ t(`profile.propertyNames.${property.name}`) }}
              </span>
              <span class="mt-1 font-bold text-gray-800">
                {{ formatPropertyValue(property.name, property.value) }}
                <small v-if="property.equipmentBonus" class="text-green-600">
                  (+{{ formatPropertyValue(property.name, property.equipmentBonus) }} {{ t('profile.fromItems') }})
                </small>
                <small v-if="property.buffBonus" class="text-amber-600">
                  (+{{ formatPropertyValue(property.name, property.buffBonus) }} {{ t('profile.fromBuff') }})
                </small>
              </span>
              <span v-if="property.rating !== undefined" class="mt-1 text-[10px] font-medium text-gray-500">
                {{ t('profile.ratingPoints', { value: property.rating }) }}
                <small v-if="property.equipmentRatingBonus" class="text-green-600">
                  (+{{ property.equipmentRatingBonus }} {{ t('profile.fromItems') }})
                </small>
              </span>
              <QTooltip class="max-w-sm bg-gray-900 p-3 text-white">
                <div>{{ t(`profile.propertyDescriptions.${property.name}`) }}</div>
                <div v-if="propertyFormula(property)" class="mt-2 border-t border-gray-600 pt-2 font-mono text-xs">
                  {{ propertyFormula(property) }}
                </div>
              </QTooltip>
            </div>
          </div>
        </QCard>
      </div>

      <div v-else-if="activeBlockKey === 'statistics'" class="h-[432px] min-h-[432px] w-full">
        <QCard class="h-full w-full rounded-lg bg-white p-5 shadow-sm">
          <div class="grid w-full grid-cols-2 gap-4 text-sm">
            <div
              v-for="summaryItem in playerSummary"
              :key="summaryItem.key"
              class="flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-3"
            >
              <span
                class="mb-1 max-w-full font-bold text-blue-600 tabular-nums"
                :class="summaryItem.key === 'experience' ? 'text-base tracking-tight whitespace-nowrap' : 'text-xl'"
              >
                {{ summaryItem.value }}
              </span>
              <div
                v-if="summaryItem.key === 'experience' && experienceToNextLevel !== null"
                class="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100"
                role="progressbar"
                :aria-valuenow="experienceProgress"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full bg-blue-500 transition-[width]"
                  :style="{ width: `${experienceProgress}%` }"
                />
              </div>
              <span class="text-center text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                {{ t(`profile.summary.${summaryItem.key}`) }}
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
import { QCard, QBtn, QTooltip } from 'quasar';
import { computed, ref } from 'vue';

import type { Component } from 'vue';
import type { EffectiveModifier, EquipmentSlotId, EquipmentSlot, InventoryItemType } from '@/modules/Inventory/types';

import { isTwoHanded } from '@/modules/Inventory/utils/equipment';

import AmuletIcon from './icons/AmuletIcon.vue';
import BannerIcon from './icons/BannerIcon.vue';
import BodyArmorIcon from './icons/BodyArmorIcon.vue';
import BootsIcon from './icons/BootsIcon.vue';
import GlovesIcon from './icons/GlovesIcon.vue';
import HelmetIcon from './icons/HelmetIcon.vue';
import LegsArmorIcon from './icons/LegsArmorIcon.vue';
import RingIcon from './icons/RingIcon.vue';
import ShieldIcon from './icons/ShieldIcon.vue';
import WeaponIcon from './icons/WeaponIcon.vue';
import InventoryItem from './InventoryItem.vue';

import SectionNavigation from '@/shared/components/SectionNavigation.vue';

const props = defineProps<{
  equipmentSlots: EquipmentSlot[];
  hoveredSlot: string | null;
  playerAttributes: EffectiveModifier[];
  playerProperties: EffectiveModifier[];
  playerLevel: number;
  playerExperience: number;
  experienceToNextLevel: number | null;
  playerGold: number;
  playerGems: number;
  killedMonsters: number;
  accomplishedQuests: number;
  playerFreeAttributes: number;
  allocatingAttribute: string | null;
  disableItemTooltips?: boolean;
}>();

const emit = defineEmits<{
  (e: 'slot-enter', id: EquipmentSlotId): void;
  (e: 'slot-leave'): void;
  (e: 'slot-drop', id: EquipmentSlotId): void;
  (e: 'unequip', id: EquipmentSlotId): void;
  (e: 'equipment-drag-start', id: EquipmentSlotId): void;
  (e: 'drag-end'): void;
  (e: 'allocate-attribute', attribute: string): void;
}>();

const { t } = useTranslation();

const leftHandItem = computed(() => props.equipmentSlots.find((s) => s.id === 'left-hand')?.item ?? null);

const getOccupiedItem = (slotId: EquipmentSlotId): InventoryItemType | null => {
  if (slotId === 'right-hand' && !props.equipmentSlots.find((s) => s.id === 'right-hand')?.item) {
    if (leftHandItem.value && isTwoHanded(leftHandItem.value)) {
      return {
        ...leftHandItem.value,
        name: t(leftHandItem.value.nameKey),
        rarity: leftHandItem.value.rarityKey ? t(leftHandItem.value.rarityKey) : undefined,
      };
    }
  }
  return null;
};

const onUnequipClick = (slotId: EquipmentSlotId) => {
  const targetSlotId = getOccupiedItem(slotId) ? 'left-hand' : slotId;
  emit('unequip', targetSlotId);
};

const onItemDoubleClick = (slotId: EquipmentSlotId) => {
  const targetSlotId = getOccupiedItem(slotId) ? 'left-hand' : slotId;
  emit('unequip', targetSlotId);
};

const onItemDragStart = (slotId: EquipmentSlotId) => {
  const targetSlotId = getOccupiedItem(slotId) ? 'left-hand' : slotId;
  emit('equipment-drag-start', targetSlotId);
};

const playerSummary = computed(() => [
  { key: 'level', value: props.playerLevel },
  {
    key: 'experience',
    value:
      props.experienceToNextLevel === null
        ? t('profile.maxLevel')
        : `${props.playerExperience} / ${props.experienceToNextLevel}`,
  },
  { key: 'gold', value: props.playerGold },
  { key: 'gems', value: props.playerGems },
  { key: 'killedMonsters', value: props.killedMonsters },
  { key: 'accomplishedQuests', value: props.accomplishedQuests },
]);

const experienceProgress = computed(() => {
  if (!props.experienceToNextLevel || props.experienceToNextLevel <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((props.playerExperience / props.experienceToNextLevel) * 100)));
});

const percentageProperties = new Set(['CRIT', 'DODGE', 'CRIT_DAMAGE']);
const formatPropertyValue = (name: string, value: number) =>
  percentageProperties.has(name) ? `${value}%` : String(value);

const propertyFormula = (property: EffectiveModifier) => {
  if (property.name === 'DEFENSE') return t('profile.propertyFormulas.defense');
  if (!percentageProperties.has(property.name)) return null;

  return property.name === 'CRIT_DAMAGE'
    ? t('profile.propertyFormulas.criticalDamage')
    : t('profile.propertyFormulas.chance');
};

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
  amulet: AmuletIcon,
  banner: BannerIcon,
};

const nextBlock = () => {
  const currentIndex = blocks.findIndex((b) => b.key === activeBlockKey.value);
  const nextIndex = (currentIndex + 1) % blocks.length;
  activeBlockKey.value = blocks[nextIndex]!.key;
};

const prevBlock = () => {
  const currentIndex = blocks.findIndex((b) => b.key === activeBlockKey.value);
  const prevIndex = (currentIndex - 1 + blocks.length) % blocks.length;
  activeBlockKey.value = blocks[prevIndex]!.key;
};
</script>
