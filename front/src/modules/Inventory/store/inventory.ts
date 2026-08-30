import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { InventoryItemType, EquipmentSlot, StatItem, StatInfoItem } from '../types';

export const useInventoryStore = defineStore('inventory', () => {
  // --- STATE ---
  const inventory = ref<(InventoryItemType | null)[]>([
    null, // Slot 1
    null, // Slot 2
    null, // Slot 3
    null, // Slot 4
    null, // Slot 5
    null, // Slot 6
    null, // Slot 7
    null, // Slot 8
    null, // Slot 9
    null, // Slot 10
    null, // Slot 11
    null, // Slot 12
    null, // Slot 13
    null, // Slot 14
    null, // Slot 15
  ]);

const equipmentSlots = ref<EquipmentSlot[]>([
  {
    id: 'head',
    labelKey: 'profile.slots.head',
    item: null,
  },
  {
    id: 'body',
    labelKey: 'profile.slots.body',
    item: null,
  },
  {
    id: 'left-hand',
    labelKey: 'profile.slots.leftHand',
    item: null,
  },
  {
    id: 'right-hand',
    labelKey: 'profile.slots.rightHand',
    item: null,
  },
  {
    id: 'hands',
    labelKey: 'profile.slots.hands',
    item: null,
  },
  { id: 'legs', labelKey: 'profile.slots.legs', item: null },
  {
    id: 'feet',
    labelKey: 'profile.slots.feet',
    item: null,
  },
  {
    id: 'accessory',
    labelKey: 'profile.slots.accessory',
    item: null,
  },
]);

  // --- ACTIONS ---

  // 1. Обмен предметов внутри инвентаря
  const swapInventoryItems = (index1: number, index2: number) => {
    const temp = inventory.value[index1];
    inventory.value[index1] = inventory.value[index2];
    inventory.value[index2] = temp;
  };

  // 2. Экипировать или поменять местами предмет из инвентаря и слота
  const equipItem = (inventoryIndex: number, slotId: string) => {
    const slot = equipmentSlots.value.find((s) => s.id === slotId);
    if (!slot) return;

    const itemFromInventory = inventory.value[inventoryIndex];
    const itemFromEquipment = slot.item;

    slot.item = itemFromInventory;
    slot.equipped = !!itemFromInventory;
    inventory.value[inventoryIndex] = itemFromEquipment;
  };

  // 3. Обмен предметов между двумя слотами экипировки
  const swapEquipmentItems = (sourceSlotId: string, targetSlotId: string) => {
    const sourceSlot = equipmentSlots.value.find((s) => s.id === sourceSlotId);
    const targetSlot = equipmentSlots.value.find((s) => s.id === targetSlotId);

    if (sourceSlot && targetSlot) {
      const temp = sourceSlot.item;
      sourceSlot.item = targetSlot.item;
      sourceSlot.equipped = !!targetSlot.item;

      targetSlot.item = temp;
      targetSlot.equipped = !!temp;
    }
  };

  // 4. Снять предмет (либо в конкретный слот инвентаря, либо в первый свободный)
  const unequipItem = (slotId: string, targetInventoryIndex?: number) => {
    const slot = equipmentSlots.value.find((s) => s.id === slotId);
    if (!slot || !slot.item) return;

    if (targetInventoryIndex !== undefined && targetInventoryIndex !== null) {
      // Кладём в конкретный слот инвентаря (и надеваем то, что там лежало, если оно там было)
      const itemInInventory = inventory.value[targetInventoryIndex];
      inventory.value[targetInventoryIndex] = slot.item;
      slot.item = itemInInventory;
      slot.equipped = !!itemInInventory;
    } else {
      // Ищем первое пустое место (для клика по крестику)
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

  return {
    inventory,
    equipmentSlots,
    swapInventoryItems,
    equipItem,
    swapEquipmentItems,
    unequipItem,
  };
});
