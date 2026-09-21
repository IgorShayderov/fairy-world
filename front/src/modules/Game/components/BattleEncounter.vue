<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-[#06141d]/85 p-5 backdrop-blur-sm">
    <section
      class="encounter-panel w-full max-w-4xl overflow-hidden rounded-2xl border border-[#ddbd6b]/45 text-white shadow-2xl"
    >
      <header class="border-b border-[#ddbd6b]/20 px-6 py-4 text-center">
        <div class="text-[10px] font-bold tracking-[0.34em] text-[#efca72] uppercase">
          {{ t('fantasy.encounter.eyebrow') }} · {{ t('fantasy.encounter.turn', { turn: battle.turn }) }}
        </div>
        <h2 class="mt-1 font-serif text-3xl font-semibold text-[#fff0bd]">
          {{ statusTitle }}
        </h2>
      </header>

      <div class="battlefield-grid relative grid grid-cols-[1fr_auto_1fr] items-center gap-7 px-8 py-7">
        <CombatantCard
          icon="auto_awesome"
          :name="playerName"
          :health="battle.player.health"
          :max-health="battle.player.maxHealth"
          :damage="battle.player.damage"
          color="player"
        />
        <div class="font-serif text-2xl font-black text-[#e8c66f]">VS</div>
        <CombatantCard
          icon="pets"
          :name="battle.monster.name"
          :health="battle.monster.health"
          :max-health="battle.monster.maxHealth"
          :damage="battle.monster.damage"
          color="monster"
        />
      </div>

      <div class="min-h-24 border-t border-[#ddbd6b]/15 bg-[#0b2029]/85 px-6 py-4">
        <h3 class="text-xs font-bold tracking-[0.16em] text-[#efca72] uppercase">
          {{ t('fantasy.encounter.combatLog') }}
        </h3>
        <div v-if="battle.events.length" class="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-[#d6e1de]">
          <div v-for="(event, index) in battle.events" :key="index">
            {{ eventText(event) }}
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-[#92aaa5]">{{ t('fantasy.encounter.chooseAction') }}</p>
        <div v-if="battle.rewards" class="mt-3">
          <div class="flex gap-4 font-bold text-[#efca72]">
            <span>+{{ battle.rewards.gold }} {{ t('profile.summary.gold') }}</span>
            <span>+{{ battle.rewards.experience }} {{ t('profile.summary.experience') }}</span>
          </div>
          <div v-if="battle.rewards.items.length" class="mt-3">
            <div class="mb-2 text-xs font-bold tracking-[0.14em] text-[#efca72] uppercase">
              {{ t('fantasy.encounter.loot') }}
            </div>
            <div class="flex flex-wrap gap-4">
              <div
                v-for="(item, index) in battle.rewards.items"
                :key="`${item.id}-${index}`"
                class="flex flex-col items-center text-center"
              >
                <InventoryItem :item="lootInventoryItem(item)" class="h-24 w-24 bg-white" />
                <div class="mt-1 text-[10px] font-bold uppercase" :class="getRarityTextClass(item.rarity)">
                  {{ t(`profile.rarity.${item.rarity.toLowerCase()}`) }}
                </div>
                <div v-if="itemActions[index] === 'dropped'" class="mt-1 text-[11px] font-semibold text-red-400">
                  {{ t('fantasy.encounter.itemDropped') }}
                </div>
                <div
                  v-else-if="itemActions[index] === 'replaced'"
                  class="mt-1 text-[11px] font-semibold text-emerald-400"
                >
                  {{ t('fantasy.encounter.itemReplaced') }}
                </div>
                <div v-else class="mt-1.5 flex flex-col items-center gap-1">
                  <template v-if="item.inventoryFull">
                    <div class="rounded bg-amber-900/80 px-2 py-0.5 text-[9px] font-bold text-amber-200">
                      {{ t('fantasy.encounter.inventoryFullLootNotice') }}
                    </div>
                    <div class="flex gap-1.5">
                      <button
                        type="button"
                        class="rounded bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white uppercase hover:bg-amber-500"
                        @click="openReplaceModal(item, index)"
                      >
                        {{ t('fantasy.encounter.replaceItem') }}
                      </button>
                      <button
                        type="button"
                        class="rounded bg-red-800/80 px-2.5 py-1 text-[10px] font-bold text-white uppercase hover:bg-red-700"
                        @click="dropLootItem(item, index)"
                      >
                        {{ t('fantasy.encounter.dropItem') }}
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      class="rounded border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
                    >
                      ✓ {{ t('fantasy.encounter.addedToInventory') }}
                    </div>
                    <button
                      type="button"
                      class="rounded bg-red-800/60 px-2 py-0.5 text-[9px] font-bold text-white/80 uppercase hover:bg-red-700"
                      @click="dropLootItem(item, index)"
                    >
                      {{ t('fantasy.encounter.dropItem') }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-2 text-xs font-medium text-[#92aaa5]">
            {{ t('fantasy.encounter.noLoot') }}
          </div>
          <div v-if="battle.rewards.craftItems?.length" class="mt-3 flex flex-wrap gap-3">
            <div
              v-for="material in battle.rewards.craftItems"
              :key="material.id"
              class="flex items-center gap-2 rounded-lg border border-[#ddbd6b]/25 bg-[#071a23] px-3 py-2"
            >
              <img :src="`/icons/items/${material.icon}`" alt="" class="h-10 w-10 object-contain" />
              <div>
                <div class="text-[10px] font-bold tracking-wider text-[#efca72] uppercase">
                  {{ t('crafting.materialDrop') }}
                </div>
                <div class="text-sm font-semibold text-white">{{ material.name }} ×{{ material.quantity }}</div>
              </div>
            </div>
          </div>
        </div>
        <p v-if="battle.status === 'DEFEAT'" class="mt-3 text-sm text-amber-200">
          {{ t('fantasy.encounter.respawn') }}
        </p>
      </div>

      <footer class="flex justify-end gap-3 border-t border-[#ddbd6b]/15 bg-[#081a23] px-6 py-4">
        <button
          v-if="battle.status === 'ACTIVE' && battle.canRetreat"
          class="rounded-lg border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wider text-[#b8cbc6] uppercase hover:bg-white/5 disabled:opacity-50"
          :disabled="loading"
          @click="$emit('retreat')"
        >
          {{ t('fantasy.encounter.retreat') }}
        </button>
        <button
          v-if="battle.status === 'ACTIVE'"
          class="rounded-lg bg-[#bd4938] px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg hover:bg-[#d15743] disabled:opacity-50"
          :disabled="loading"
          @click="$emit('attack')"
        >
          {{ loading ? t('fantasy.encounter.attacking') : t('fantasy.encounter.attack') }}
        </button>
        <button
          v-else
          class="rounded-lg border border-[#dfc16d]/45 bg-[#dfc16d]/10 px-6 py-2.5 text-xs font-bold tracking-wider text-[#ffe69a] uppercase hover:bg-[#dfc16d]/20"
          @click="$emit('close')"
        >
          {{ t('fantasy.encounter.returnToMap') }}
        </button>
      </footer>
    </section>

    <!-- Modal to choose an item from inventory to replace -->
    <div
      v-if="replacingItemIndex !== null && replacingLootItem"
      class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        class="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-400/50 bg-[#0d222d] text-white shadow-2xl"
      >
        <header class="border-b border-[#ddbd6b]/20 bg-[#081a23] px-6 py-3">
          <h3 class="font-serif text-lg font-bold text-amber-300">
            {{ t('fantasy.encounter.selectItemToReplace') }}
          </h3>
          <p class="text-xs text-amber-200/80">
            {{ t('fantasy.encounter.inventoryFullLootNotice') }}
          </p>
        </header>

        <div class="space-y-3 p-4">
          <!-- Comparison Panel: New Loot Item vs Selected Item to Replace -->
          <div class="grid grid-cols-2 gap-4 rounded-xl border border-amber-500/25 bg-[#06141d]/80 p-3">
            <!-- Left: New loot item -->
            <div class="flex items-center gap-3">
              <InventoryItem :item="lootInventoryItem(replacingLootItem)" class="h-16 w-16 shrink-0 bg-white" />
              <div class="min-w-0 flex-1">
                <div class="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  {{ t('fantasy.encounter.newItemToReceive') }}
                </div>
                <div class="truncate text-sm font-bold text-white">{{ replacingLootItem.name }}</div>
                <div class="text-xs" :class="getRarityTextClass(replacingLootItem.rarity)">
                  {{ t(`profile.rarity.${replacingLootItem.rarity.toLowerCase()}`) }} · {{ t('profile.summary.level') }}
                  {{ replacingLootItem.level }}
                </div>
              </div>
            </div>

            <!-- Right: Selected item to discard -->
            <div class="flex items-center gap-3 border-l border-white/10 pl-4">
              <template v-if="selectedBackpackItem">
                <InventoryItem :item="selectedBackpackItem" class="h-16 w-16 shrink-0 bg-white" />
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] font-bold tracking-wider text-red-400 uppercase">
                    {{ t('fantasy.encounter.itemToDiscard') }}
                  </div>
                  <div class="truncate text-sm font-bold text-white">{{ selectedBackpackItem.name }}</div>
                  <div class="text-xs" :class="getRarityTextClass(selectedBackpackItem.rarityKey)">
                    {{ selectedBackpackItem.rarity }} · {{ t('profile.summary.level') }}
                    {{ selectedBackpackItem.level }}
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-600 text-xs text-gray-400"
                >
                  ?
                </div>
                <div class="text-xs text-gray-400 italic">
                  {{ t('fantasy.encounter.selectItemToReplace') }}
                </div>
              </template>
            </div>
          </div>

          <!-- Backpack Items Grid -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-xs font-bold tracking-wider text-gray-300 uppercase">
                {{ t('profile.inventory') }} ({{ playerBackpackItems.length }}/24)
              </span>
              <span class="text-[11px] text-gray-400">
                {{ t('shop.comparedWithEquipped') }}
              </span>
            </div>

            <div
              v-if="playerBackpackItems.length === 0"
              class="rounded-lg border border-dashed border-gray-700 py-6 text-center text-sm text-gray-400"
            >
              {{ t('shop.inventoryEmpty') }}
            </div>

            <div v-else class="grid grid-cols-6 gap-2 sm:grid-cols-8">
              <div
                v-for="invItem in playerBackpackItems"
                :key="invItem.inventoryItemId"
                class="group relative flex cursor-pointer flex-col items-center rounded-xl p-1 transition"
                :class="
                  selectedBackpackItem?.inventoryItemId === invItem.inventoryItemId
                    ? 'scale-105 bg-amber-950/60 shadow-lg ring-2 ring-amber-400'
                    : 'bg-white/5 hover:bg-white/10 hover:ring-1 hover:ring-white/30'
                "
                @click="selectedBackpackItem = invItem"
              >
                <InventoryItem :item="invItem" class="h-14 w-14 shrink-0 bg-white" />
              </div>
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-[#ddbd6b]/20 bg-[#081a23] px-6 py-3">
          <button
            type="button"
            class="rounded-lg border border-gray-600 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800"
            @click="closeReplaceModal"
          >
            {{ t('fantasy.encounter.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-lg transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!selectedBackpackItem"
            @click="selectedBackpackItem && confirmReplace(selectedBackpackItem)"
          >
            {{ t('fantasy.encounter.confirmReplace') }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { Notify, QIcon } from 'quasar';
import { computed, defineComponent, h, ref } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getBattleEventSubject } from '@/modules/Game/battleEvent';
import { getRarityTextClass } from '@/modules/Inventory/utils/rarity';
import type { BattleState } from '@/modules/Monsters/api';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{ battle: BattleState; playerName: string; loading: boolean }>();
defineEmits<{ (event: 'attack'): void; (event: 'retreat'): void; (event: 'close'): void }>();
const { t } = useTranslation();

const currentUserStore = useCurrentUserStore();
const itemActions = ref<Record<number, 'dropped' | 'replaced'>>({});
const replacingItemIndex = ref<number | null>(null);
const replacingLootItem = ref<NonNullable<BattleState['rewards']>['items'][number] | null>(null);
const selectedBackpackItem = ref<InventoryItemType | null>(null);

const playerBackpackItems = computed<InventoryItemType[]>(() => {
  return (currentUserStore.user?.inventory ?? []).map((entry) => ({
    inventoryItemId: entry.id,
    id: entry.item.id,
    level: entry.item.level ?? 1,
    requiredPlayerLevel: entry.item.requiredPlayerLevel ?? 1,
    nameKey: entry.item.name,
    name: entry.item.name,
    tooltipName: entry.item.name,
    icon: entry.item.icon,
    description: entry.item.description,
    price: entry.item.price,
    rarity: t(`profile.rarity.${entry.item.rarity.toLowerCase()}`),
    rarityKey: entry.item.rarity,
    equipmentType: entry.item.equipmentType,
    attributes: entry.item.attributes,
    properties: entry.item.properties,
    quantity: entry.quantity,
    slot: null,
  }));
});

const openReplaceModal = (item: NonNullable<BattleState['rewards']>['items'][number], index: number) => {
  replacingLootItem.value = item;
  replacingItemIndex.value = index;
  selectedBackpackItem.value = null;
};

const closeReplaceModal = () => {
  replacingItemIndex.value = null;
  replacingLootItem.value = null;
  selectedBackpackItem.value = null;
};

const confirmReplace = async (invItem: { inventoryItemId?: number }) => {
  if (replacingItemIndex.value === null || !replacingLootItem.value || !invItem.inventoryItemId) return;
  try {
    await usersApi.replaceInventoryItem(invItem.inventoryItemId, replacingLootItem.value.id);
    itemActions.value[replacingItemIndex.value] = 'replaced';
    closeReplaceModal();
    await currentUserStore.fetchCurrentUser(true);
    Notify.create({ type: 'positive', message: t('fantasy.encounter.itemReplaced') });
  } catch (error) {
    console.error('Replace failed:', error);
  }
};

const dropLootItem = async (item: NonNullable<BattleState['rewards']>['items'][number], index: number) => {
  try {
    if (item.inventoryItemId) {
      await usersApi.dropInventoryItem(item.inventoryItemId);
      await currentUserStore.fetchCurrentUser(true);
    }
    itemActions.value[index] = 'dropped';
    Notify.create({ type: 'info', message: t('fantasy.encounter.itemDropped') });
  } catch (error) {
    console.error('Drop failed:', error);
  }
};

const lootInventoryItem = (item: NonNullable<BattleState['rewards']>['items'][number]): InventoryItemType => ({
  id: item.id,
  nameKey: item.name,
  name: item.name,
  tooltipName: item.name,
  icon: item.icon,
  description: item.description,
  price: item.price,
  rarity: t(`profile.rarity.${item.rarity.toLowerCase()}`),
  rarityKey: item.rarity,
  equipmentType: item.equipmentType,
  attributes: item.attributes ?? [],
  properties: item.properties ?? [],
  quantity: item.quantity,
});

const statusTitle = computed(() => {
  if (props.battle.status === 'VICTORY') return t('fantasy.encounter.victory');
  if (props.battle.status === 'DEFEAT') return t('fantasy.encounter.defeat');
  return t('fantasy.encounter.title');
});

const eventText = (event: BattleState['events'][number]) => {
  const actor = t(`fantasy.encounter.${getBattleEventSubject(event)}`);
  if (event.dodged) return t('fantasy.encounter.dodged', { actor });
  return t(event.critical ? 'fantasy.encounter.criticalHit' : 'fantasy.encounter.hit', {
    actor,
    damage: event.damage,
  });
};

const CombatantCard = defineComponent({
  props: {
    icon: { type: String, required: true },
    name: { type: String, required: true },
    health: { type: Number, required: true },
    maxHealth: { type: Number, required: true },
    damage: { type: Number, required: true },
    color: { type: String, required: true },
  },
  setup(card) {
    return () =>
      h('div', { class: 'flex flex-col items-center' }, [
        h('div', { class: `combatant combatant-${card.color}` }, [h(QIcon, { name: card.icon, size: '46px' })]),
        h('div', { class: 'mt-3 text-sm font-bold tracking-wide' }, card.name),
        h('div', { class: 'mt-2 h-3 w-full max-w-52 overflow-hidden rounded-full bg-black/40' }, [
          h('div', {
            class:
              card.color === 'player' ? 'h-full bg-emerald-400 transition-all' : 'h-full bg-red-400 transition-all',
            style: { width: `${Math.max(0, (card.health / card.maxHealth) * 100)}%` },
          }),
        ]),
        h('div', { class: 'mt-1 text-xs text-white/75' }, `${card.health} / ${card.maxHealth} HP · ${card.damage} DMG`),
      ]);
  },
});
</script>

<style scoped>
.encounter-panel {
  background: linear-gradient(145deg, rgb(14 38 47 / 98%), rgb(20 28 36 / 98%));
}
.battlefield-grid {
  background:
    radial-gradient(circle at 25% 50%, rgb(67 167 147 / 16%), transparent 30%),
    radial-gradient(circle at 75% 50%, rgb(198 77 59 / 18%), transparent 30%), #102831;
}
.combatant {
  display: flex;
  width: 92px;
  height: 92px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.combatant-player {
  color: #9ce2d2;
  border: 2px solid rgb(127 218 197 / 60%);
  background: #173f40;
}
.combatant-monster {
  color: #ffab95;
  border: 2px solid rgb(238 111 83 / 60%);
  background: #42242a;
}
</style>
