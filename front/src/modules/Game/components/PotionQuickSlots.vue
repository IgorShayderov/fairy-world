<template>
  <section
    class="potion-belt"
    :class="{ 'potion-belt--manage': manage }"
    aria-label="Health potion quick slots"
    @keydown.esc="editing = null"
  >
    <div v-for="(entry, index) in slots" :key="index" class="belt-slot">
      <button
        class="potion-use"
        :class="{
          'potion-drop-ready': canDrop(index),
          'potion-drop-over': hoveredSlot === index,
          'potion-locked': locked(index),
        }"
        type="button"
        :aria-label="
          manage
            ? t('potionSlots.configure', { slot: index + 1 })
            : entry
              ? `Drink ${entry.item.name} from slot ${index + 1}`
              : `Assign potion slot ${index + 1}`
        "
        :disabled="pending || (!!entry && (disabled || usedThisTurn) && !manage)"
        :title="
          usedThisTurn && !manage
            ? 'One health potion per turn — available next turn'
            : entry
              ? `${entry.item.name} · +${getHealthPotionRestore(entry.item.name)} HP · 1 potion`
              : 'Empty slot — assign one HP potion'
        "
        @click="entry && !manage ? $emit('drink', entry.id) : openPicker(index)"
        @dragover="onDragOver($event, index)"
        @dragleave="hoveredSlot = null"
        @drop.prevent.stop="onDrop($event, index)"
      >
        <small>{{ index + 1 }}</small
        ><PotionIcon v-if="entry" :name="entry.item.name" class="h-8 w-8" /><span v-else>{{
          locked(index) ? '♔' : '+'
        }}</span>
        <span v-if="manage" class="slot-caption">{{ entry ? entry.item.name : t('potionSlots.add') }}</span>
        <span v-if="manage && index >= 5" class="premium-caption">{{ t('potionSlots.premium') }}</span>
      </button>
      <button
        v-if="!manage"
        class="slot-edit"
        type="button"
        :aria-label="`Configure potion slot ${index + 1}`"
        :disabled="pending"
        @click="openPicker(index)"
      >
        ✎
      </button>
    </div>
    <QDialog :model-value="editing !== null" :persistent="pending" @update:model-value="!$event && (editing = null)">
      <div v-if="editing !== null" class="potion-picker" aria-label="Assign one health potion">
        <header>
          <strong>Slot {{ editing + 1 }} · one potion</strong
          ><button aria-label="Close potion picker" :disabled="pending" @click="editing = null">×</button>
        </header>
        <p v-if="locked(editing)">{{ t('potionSlots.premiumRequired') }}</p>
        <p v-else-if="!potions.length">No eligible HP potions in your backpack.</p>
        <button
          v-for="potion in locked(editing) ? [] : potions"
          :key="potion.id"
          :disabled="pending"
          @click="assign(potion.id)"
        >
          {{ potion.item.name }} · +{{ getHealthPotionRestore(potion.item.name) }} HP<span v-if="manage">
            · {{ t('potionSlots.available', { count: potion.quantity }) }}</span
          >
        </button>
        <button v-if="slots[editing]" :disabled="pending" @click="assign(null)">Return potion to backpack</button>
        <p v-if="error" role="alert">{{ error }}</p>
      </div>
    </QDialog>
  </section>
</template>
<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog } from 'quasar';
import { computed, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getHealthPotionRestore, getPotionRequiredLevel } from '@/modules/Inventory/utils/potions';
import routes from '@/routes';
import { api } from '@shared/api';

import PotionIcon from '@/modules/Inventory/components/icons/PotionIcon.vue';
const props = defineProps<{
  disabled?: boolean;
  usedThisTurn?: boolean | undefined;
  manage?: boolean;
  dragInventoryItemId?: number | undefined;
}>();
const emit = defineEmits<{ drink: [inventoryItemId: number]; changed: [] }>();
const { t } = useTranslation();
const user = useCurrentUserStore();
const pending = ref(false),
  error = ref(''),
  editing = ref<number | null>(null);
const hoveredSlot = ref<number | null>(null);
const premium = computed(() => !!user.user?.premium?.active);
const locked = (index: number) => index >= 5 && !premium.value;
const slots = computed(() =>
  Array.from({ length: props.manage || premium.value ? 8 : 5 }, (_, index) =>
    user.user?.potionSlots?.find((entry) => entry.slot === `potion-${index + 1}` && entry.quantity === 1)
  )
);
const potions = computed(() =>
  (user.user?.inventory ?? []).filter(
    (p) =>
      !p.isEquiped &&
      p.slot === null &&
      p.quantity > 0 &&
      getHealthPotionRestore(p.item.name) > 0 &&
      getPotionRequiredLevel(p.item.name) <= (user.user?.level ?? 1)
  )
);
function openPicker(index: number) {
  error.value = '';
  editing.value = index;
}
function canDrop(index: number) {
  return (
    props.manage && !pending.value && !locked(index) && potions.value.some((p) => p.id === props.dragInventoryItemId)
  );
}
function onDragOver(event: DragEvent, index: number) {
  if (!canDrop(index)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  hoveredSlot.value = index;
}
async function onDrop(event: DragEvent, index: number) {
  hoveredSlot.value = null;
  if (!props.manage || pending.value || locked(index)) return;
  const id = Number(event.dataTransfer?.getData('application/x-fairy-inventory-item'));
  if (!potions.value.some((p) => p.id === id)) return;
  await assign(id, index);
}
async function assign(id: number | null, index = editing.value) {
  if (index === null || pending.value || (id !== null && locked(index))) return;
  pending.value = true;
  error.value = '';
  try {
    await api.put(routes.api.users.potionSlotPath(index + 1), { inventoryItemId: id });
    await user.fetchCurrentUser(true);
    emit('changed');
    editing.value = null;
  } catch (reason) {
    editing.value = index;
    error.value = reason instanceof Error ? reason.message : 'Could not assign potion';
  } finally {
    pending.value = false;
  }
}
</script>
<style scoped>
.potion-belt {
  position: relative;
  display: flex;
  gap: 5px;
  padding: 6px;
  border: 1px solid #85734c;
  border-radius: 10px;
  background: #071a22ed;
}
.belt-slot {
  position: relative;
}
.potion-use {
  width: 44px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid #807043;
  border-radius: 6px;
  color: #ffe3a4;
  background: radial-gradient(ellipse at bottom, #69402b, #102c35);
  font-size: 22px;
}
.potion-use small {
  position: absolute;
  left: 4px;
  top: 2px;
  font-size: 9px;
  color: #e0ccb0;
}
.potion-use:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.slot-edit {
  position: absolute;
  bottom: -3px;
  right: -1px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #17333c;
  color: #ffe3a4;
  font-size: 12px;
}
.potion-picker {
  width: min(440px, calc(100vw - 32px));
  max-height: min(480px, calc(100dvh - 48px));
  overflow-y: auto;
  padding: 20px;
  background: #0b2630;
  border: 1px solid #bda15d;
  border-radius: 10px;
  color: #f4deb0;
  box-shadow: 0 5px 25px #000b;
  font-size: 14px;
}
.potion-picker header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.potion-picker > button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 9px;
  border-top: 1px solid #496064;
}
.potion-picker > button:hover {
  background: #27424a;
}
.potion-belt--manage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 900px;
  padding: 12px;
}
.potion-belt--manage .potion-use {
  width: 100%;
  min-height: 100px;
  height: auto;
  padding: 18px 6px 8px;
  cursor: pointer;
}
.slot-caption {
  font-size: 12px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.potion-use.potion-drop-ready {
  border-color: #4ed6b3;
  box-shadow: inset 0 0 0 1px #4ed6b3;
}
.potion-use.potion-drop-over {
  background: #255248;
  outline: 2px solid #96ffe2;
}
.potion-use.potion-locked {
  background: #10252e;
  border-style: dashed;
}
.premium-caption {
  color: #e6c16c;
  font-size: 10px;
}
</style>
