<template>
  <div class="realm-page profile-page">
    <div class="profile-layout">
      <ActiveBuffs class="profile-buffs" :buffs="currentUserStore.user?.activeBuffs ?? []" />
      <div class="profile-panels">
        <EquipmentSection
          class="profile-equipment"
          :equipment-slots="equipmentSlots"
          :hovered-slot="isHoveredSlot"
          :player-attributes="currentUserStore.user?.attributes ?? []"
          :player-properties="currentUserStore.user?.properties ?? []"
          :player-level="currentUserStore.user?.level ?? 1"
          :player-experience="currentUserStore.user?.experience ?? 0"
          :experience-to-next-level="currentUserStore.user?.experienceToNextLevel ?? null"
          :player-gold="currentUserStore.user?.gold ?? 0"
          :player-gems="currentUserStore.user?.gems ?? 0"
          :player-coins-of-honour="currentUserStore.user?.coinsOfHonour ?? 0"
          :killed-monsters="currentUserStore.user?.killedMonsters ?? 0"
          :dungeons-cleared="currentUserStore.user?.dungeonsCleared ?? 0"
          :accomplished-quests="currentUserStore.user?.accomplishedQuests ?? 0"
          :player-free-attributes="currentUserStore.user?.freeAttributes ?? 0"
          :allocating-attribute="allocatingAttribute"
          :active-clan-banner-code="currentUserStore.user?.activeClanBannerCode ?? null"
          :active-clan-banner-bonus-percent="currentUserStore.user?.activeClanBannerPvpBonusPercent ?? 0"
          :active-clan-banner="currentUserStore.user?.activeClanBanner ?? null"
          :disable-item-tooltips="dragUpgradeItem !== null"
          @slot-enter="(id) => (isHoveredSlot = id)"
          @slot-leave="isHoveredSlot = null"
          @slot-drop="onSlotDrop"
          @unequip="unequip"
          @equipment-drag-start="onEquipmentDragStart"
          @drag-end="onDragEnd"
          @allocate-attribute="allocateAttribute"
        />

        <InventorySection
          class="profile-inventory"
          :inventory="inventory"
          :equipment-slots="equipmentSlots"
          :drag-index="dragItemIndex"
          :is-hovered="isHoveredSlot"
          :craft-inventory="currentUserStore.user?.craftInventory ?? []"
          :crafting-available="(currentUserStore.user?.level ?? 1) >= CRAFTING_MIN_LEVEL"
          @drag-start="onInventoryDragStart"
          @drag-end="onDragEnd"
          @inventory-drop="onInventoryDrop"
          @item-double-click="equipFromInventory"
        />
      </div>
      <section
        class="profile-potions"
        aria-labelledby="potion-slots-title"
      >
        <h2 id="potion-slots-title" class="text-lg font-semibold">{{ t('potionSlots.title') }}</h2>
        <p class="mt-2 mb-4 text-sm text-[#a9bec8]">{{ t('potionSlots.hint') }}</p>
        <PotionQuickSlots manage :drag-inventory-item-id="dragItem?.inventoryItemId" @changed="syncPotionInventory" />
      </section>
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
import { CRAFTING_MIN_LEVEL, craftingApi } from '@/modules/Crafting/api';
import { useInventoryStore } from '@/modules/Inventory/store/inventory';
import { getCompatibleEquipmentSlots, isTwoHanded } from '@/modules/Inventory/utils/equipment';
import { getPotionRequiredLevel, isHealthPotion, isPotion } from '@/modules/Inventory/utils/potions';

import ActiveBuffs from '@/modules/Game/components/ActiveBuffs.vue';
import PotionQuickSlots from '@/modules/Game/components/PotionQuickSlots.vue';
import EquipmentSection from '@modules/Inventory/components/EquipmentSection.vue';
import InventorySection from '@modules/Inventory/components/InventorySection.vue';

const inventoryStore = useInventoryStore();
const currentUserStore = useCurrentUserStore();
const syncPotionInventory = () =>
  inventoryStore.hydrateInventory(currentUserStore.user?.inventory ?? [], currentUserStore.user?.equippedItems ?? []);
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
const dragUpgradeItem = ref<InventoryItemType | null>(null);
const isHoveredSlot = ref<string | null>(null);
const allocatingAttribute = ref<string | null>(null);
const CRAFT_UPGRADE_ICONS = new Set([
  'craft_damage_millstone.png',
  'craft_defense_plate.png',
  'craft_gold_sigil.png',
  'craft_experience_rune.png',
  'craft_health_crystal.png',
]);
const isCraftUpgradeItem = (item: InventoryItemType) =>
  Boolean(item.craftUpgradeType) || CRAFT_UPGRADE_ICONS.has(item.icon);

onMounted(async () => {
  await currentUserStore.fetchCurrentUser(true);
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
    dragUpgradeItem.value = isCraftUpgradeItem(item) ? item : null;
  }
};

const onEquipmentDragStart = (slotId: EquipmentSlotId) => {
  const slot = equipmentSlots.value.find((s) => s.id === slotId);
  if (slot && slot.item) {
    dragItem.value = slot.item;
    dragEquipmentSlotId.value = slotId;
    dragItemIndex.value = null;
    dragUpgradeItem.value = null;
  }
};

const onDragEnd = () => {
  dragItem.value = null;
  dragItemIndex.value = null;
  dragEquipmentSlotId.value = null;
  dragUpgradeItem.value = null;
  isHoveredSlot.value = null;
};

const onInventoryDrop = async (targetIndex: number) => {
  const craftUpgrade = dragUpgradeItem.value;
  try {
    if (craftUpgrade) {
      const target = inventory.value[targetIndex];
      if (!target?.inventoryItemId) return;
      if (!craftUpgrade.inventoryItemId) return;
      await applyCraftUpgrade(craftUpgrade, target);
    } else if (dragItemIndex.value !== null && dragItemIndex.value !== targetIndex) {
      inventoryStore.swapInventoryItems(dragItemIndex.value, targetIndex);
    } else if (dragEquipmentSlotId.value !== null) {
      await usersApi.unequipItem(dragEquipmentSlotId.value);
      await refreshInventory();
    }
  } catch (error: unknown) {
    if (craftUpgrade) {
      const responseMessage = error instanceof Error ? error.message : null;
      const message = responseMessage?.includes('already been upgraded')
        ? t('crafting.alreadyUpgraded')
        : (responseMessage ?? t('crafting.error'));
      $q.notify({ type: 'negative', message });
    } else {
      throw error;
    }
  } finally {
    onDragEnd();
  }
};

const onSlotDrop = async (slotId: EquipmentSlotId) => {
  const craftUpgrade = dragUpgradeItem.value;
  try {
    if (craftUpgrade) {
      const targetSlotId =
        slotId === 'right-hand' && !equipmentSlots.value.find((slot) => slot.id === slotId)?.item
          ? 'left-hand'
          : slotId;
      const target = equipmentSlots.value.find((slot) => slot.id === targetSlotId)?.item;
      if (!target?.inventoryItemId || !craftUpgrade.inventoryItemId) return;
      await applyCraftUpgrade(craftUpgrade, target);
    } else if (dragItemIndex.value !== null) {
      const item = inventory.value[dragItemIndex.value];
      if (item?.inventoryItemId && getCompatibleEquipmentSlots(item).includes(slotId) && canEquip(item)) {
        await usersApi.equipItem(item.inventoryItemId, slotId);
      }
    } else if (dragEquipmentSlotId.value !== null && dragEquipmentSlotId.value !== slotId) {
      const source = equipmentSlots.value.find((slot) => slot.id === dragEquipmentSlotId.value)?.item;
      if (source?.inventoryItemId && canEquip(source)) await usersApi.equipItem(source.inventoryItemId, slotId);
    }
    if (!craftUpgrade) await refreshInventory();
  } catch (error: unknown) {
    if (craftUpgrade) notifyCraftUpgradeError(error);
    else throw error;
  } finally {
    onDragEnd();
  }
};

const applyCraftUpgrade = async (craftUpgrade: InventoryItemType, target: InventoryItemType) => {
  if (!craftUpgrade.inventoryItemId || !target.inventoryItemId) return;
  await craftingApi.applyUpgrade(craftUpgrade.inventoryItemId, target.inventoryItemId);
  $q.notify({ type: 'positive', message: t('crafting.applied', { name: craftUpgrade.name }) });
  await refreshInventory();
};

const notifyCraftUpgradeError = (error: unknown) => {
  const responseMessage = error instanceof Error ? error.message : null;
  const message = responseMessage?.includes('already been upgraded')
    ? t('crafting.alreadyUpgraded')
    : (responseMessage ?? t('crafting.error'));
  $q.notify({ type: 'negative', message });
};

const unequip = async (slotId: EquipmentSlotId) => {
  await usersApi.unequipItem(slotId);
  await refreshInventory();
};

const equipFromInventory = async (inventoryIndex: number) => {
  const item = inventory.value[inventoryIndex];
  if (!item?.inventoryItemId) return;

  if (item.equipmentType?.includes('RECIPE')) {
    try {
      await usersApi.consumeInventoryItem(item.inventoryItemId);
      $q.notify({ type: 'positive', message: t('crafting.recipeLearned') });
      await refreshInventory();
    } catch (error: unknown) {
      $q.notify({ type: 'negative', message: error instanceof Error ? error.message : t('crafting.error') });
    }
    return;
  }

  if (isPotion(item)) {
    if (isHealthPotion(item)) {
      $q.notify({ type: 'info', message: t('profile.healthPotionDungeonOnly') });
      return;
    }
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
  const targetSlot = compatibleSlots.find((slotId) => !isSlotOccupied(slotId)) ?? compatibleSlots[0];
  if (!targetSlot) return;

  await usersApi.equipItem(item.inventoryItemId, targetSlot);
  await refreshInventory();
};
</script>

<style scoped>
.profile-page {
  --profile-slot-size: 88px;
  --profile-grid-height: 400px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  container-type: inline-size;
}
.profile-layout {
  display: grid;
  grid-template-columns: 150px minmax(0, 832px);
  gap: 16px;
  align-items: start;
  justify-content: center;
  max-width: 100%;
  margin: 0 auto;
}
.profile-buffs {
  grid-column: 1;
  grid-row: 1 / span 2;
  min-width: 0;
}
.profile-buffs :deep(h2) {
  font-size: 14px;
  line-height: 20px;
  margin: 0 0 12px;
  font-weight: 700;
}
.profile-panels {
  grid-column: 2;
  display: flex;
  gap: 16px;
  align-items: start;
  min-width: 0;
}
.profile-equipment,
.profile-inventory {
  flex: 1;
  min-width: 0;
  width: 400px;
  padding: 16px;
}
.profile-panels :deep(h2) {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  margin: 0;
}
.profile-potions {
  grid-column: 2;
  min-width: 0;
  padding: 12px;
  border: 1px solid #39525c;
  border-radius: 12px;
  background: #132c38;
}
.profile-potions h2 {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  margin: 0;
}
.profile-potions p {
  font-size: 12px;
  line-height: 16px;
  margin: 6px 0 10px;
}
.profile-potions :deep(.potion-belt--manage) {
  padding: 6px;
  gap: 6px;
  grid-template-columns: repeat(8, minmax(0, 1fr));
}
.profile-potions :deep(.potion-use) {
  min-height: 80px;
}
@container (max-width: 1000px) {
  .profile-layout { grid-template-columns: minmax(0, 1fr); }
  .profile-buffs { grid-column: 1; grid-row: auto; }
  .profile-panels, .profile-potions { grid-column: 1; }
}
@container (max-width: 740px) {
  .profile-panels { flex-wrap: wrap; }
  .profile-equipment, .profile-inventory { flex: 1 0 100%; }
  .profile-potions :deep(.potion-belt--manage) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
