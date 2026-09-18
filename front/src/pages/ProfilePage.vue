<template>
  <div class="realm-page flex min-h-0 flex-1 flex-col overflow-auto p-6">
    <div class="mx-auto flex w-max min-w-full flex-col gap-6">
      <div class="flex flex-row items-start justify-center gap-8">
        <EquipmentSection
          class="shrink-0"
          :equipment-slots="equipmentSlots"
          :hovered-slot="isHoveredSlot"
          :player-attributes="currentUserStore.user?.attributes ?? []"
          :player-properties="currentUserStore.user?.properties ?? []"
          :player-level="currentUserStore.user?.level ?? 1"
          :player-experience="currentUserStore.user?.experience ?? 0"
          :experience-to-next-level="currentUserStore.user?.experienceToNextLevel ?? null"
          :player-gold="currentUserStore.user?.gold ?? 0"
          :player-gems="currentUserStore.user?.gems ?? 0"
          :killed-monsters="currentUserStore.user?.killedMonsters ?? 0"
          :accomplished-quests="currentUserStore.user?.accomplishedQuests ?? 0"
          :player-free-attributes="currentUserStore.user?.freeAttributes ?? 0"
          :allocating-attribute="allocatingAttribute"
          @slot-enter="(id) => (isHoveredSlot = id)"
          @slot-leave="isHoveredSlot = null"
          @slot-drop="onSlotDrop"
          @unequip="unequip"
          @equipment-drag-start="onEquipmentDragStart"
          @drag-end="onDragEnd"
          @allocate-attribute="allocateAttribute"
        />

        <InventorySection
          class="w-fit shrink-0"
          :inventory="inventory"
          :equipment-slots="equipmentSlots"
          :drag-index="dragItemIndex"
          :is-hovered="isHoveredSlot"
          @drag-start="onInventoryDragStart"
          @drag-end="onDragEnd"
          @inventory-drop="onInventoryDrop"
          @item-double-click="equipFromInventory"
        />
      </div>
      <ActiveBuffs class="w-full shrink-0" :buffs="currentUserStore.user?.activeBuffs ?? []" />
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';

import type { EquipmentSlotId, InventoryItemType } from '@/modules/Inventory/types';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { useInventoryStore } from '@/modules/Inventory/store/inventory';
import { getCompatibleEquipmentSlots, isTwoHanded } from '@/modules/Inventory/utils/equipment';
import { getPotionRequiredLevel, isHealthPotion, isPotion } from '@/modules/Inventory/utils/potions';

import ActiveBuffs from '@/modules/Game/components/ActiveBuffs.vue';
import EquipmentSection from '@modules/Inventory/components/EquipmentSection.vue';
import InventorySection from '@modules/Inventory/components/InventorySection.vue';

const inventoryStore = useInventoryStore();
const currentUserStore = useCurrentUserStore();
const { t } = useTranslation();
const $q = useQuasar();
const canEquip = (item: InventoryItemType) => {
  const required = isPotion(item)
    ? Math.max(item.requiredPlayerLevel ?? 1, getPotionRequiredLevel(item.name ?? item.nameKey))
    : (item.requiredPlayerLevel ?? Math.max(1, Math.ceil((item.level ?? 1) - 3 * 1.1)));
  if ((currentUserStore.user?.level ?? 1) >= required) return true;
  $q.notify({ type: 'negative', message: t('profile.requiredLevel', { level: required }) });
  return false;
};
const { inventory, equipmentSlots } = storeToRefs(inventoryStore);

const dragItem = ref<InventoryItemType | null>(null);
const dragItemIndex = ref<number | null>(null);
const dragEquipmentSlotId = ref<EquipmentSlotId | null>(null);
const isHoveredSlot = ref<string | null>(null);
const allocatingAttribute = ref<string | null>(null);

onMounted(async () => {
  await currentUserStore.fetchCurrentUser();
  inventoryStore.hydrateInventory(currentUserStore.user?.inventory ?? [], currentUserStore.user?.equippedItems ?? []);
});

const refreshInventory = async () => {
  await currentUserStore.fetchCurrentUser(true);
  inventoryStore.hydrateInventory(currentUserStore.user?.inventory ?? [], currentUserStore.user?.equippedItems ?? []);
};

const allocateAttribute = async (attribute: string) => {
  if (allocatingAttribute.value || (currentUserStore.user?.freeAttributes ?? 0) < 1) return;
  allocatingAttribute.value = attribute;
  try {
    await usersApi.allocateAttribute(attribute);
    await currentUserStore.fetchCurrentUser(true);
  } finally {
    allocatingAttribute.value = null;
  }
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
      if (item?.inventoryItemId && getCompatibleEquipmentSlots(item).includes(slotId) && canEquip(item)) {
        await usersApi.equipItem(item.inventoryItemId, slotId);
      }
    } else if (dragEquipmentSlotId.value !== null && dragEquipmentSlotId.value !== slotId) {
      const source = equipmentSlots.value.find((slot) => slot.id === dragEquipmentSlotId.value)?.item;
      if (source?.inventoryItemId && canEquip(source)) await usersApi.equipItem(source.inventoryItemId, slotId);
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

  if (isPotion(item) && !isHealthPotion(item)) {
    if (!canEquip(item)) return;
    await usersApi.consumeInventoryItem(item.inventoryItemId);
    await refreshInventory();
    return;
  }

  const compatibleSlots = getCompatibleEquipmentSlots(item);
  if (!canEquip(item)) return;
  const isSlotOccupied = (slotId: EquipmentSlotId) => {
    const slot = equipmentSlots.value.find((s) => s.id === slotId);
    if (slot?.item) return true;
    if (slotId === 'right-hand') {
      const leftHand = equipmentSlots.value.find((s) => s.id === 'left-hand')?.item;
      if (leftHand && isTwoHanded(leftHand)) return true;
    }
    return false;
  };
  const targetSlot =
    compatibleSlots.find((slotId) => !isSlotOccupied(slotId)) ??
    compatibleSlots[0];
  if (!targetSlot) return;

  await usersApi.equipItem(item.inventoryItemId, targetSlot);
  await refreshInventory();
};
</script>
