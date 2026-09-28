<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#06141d]/85 p-5 backdrop-blur-sm">
    <section
      class="encounter-panel flex max-h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#ddbd6b]/45 text-white shadow-2xl"
    >
      <header class="shrink-0 border-b border-[#ddbd6b]/20 px-6 py-4 text-center">
        <div class="text-[10px] font-bold tracking-[0.34em] text-[#efca72] uppercase">
          {{ t('fantasy.encounter.eyebrow') }} · {{ t('fantasy.encounter.turn', { turn: battle.turn }) }}
        </div>
        <h2 class="mt-1 font-serif text-3xl font-semibold text-[#fff0bd]">
          {{ statusTitle }}
        </h2>
      </header>

      <div v-if="mode === 'tactical'" class="tactical-battlefield relative shrink-0 overflow-hidden">
        <div class="battle-haze" />
        <div class="battle-command-bar">
          <div class="initiative-ribbon">
            <span class="initiative-unit initiative-unit--active"><QIcon name="shield" /> {{ playerName }}</span>
            <QIcon name="chevron_right" />
            <span class="initiative-unit"><QIcon name="pest_control" /> {{ battle.monster.name }}</span>
          </div>
          <div class="turn-standard">
            <QIcon name="shield" size="18px" />
            {{ t('fantasy.encounter.tacticalTurn', { turn: battle.turn }) }}
          </div>
          <div class="arena-instruction">
            <QIcon :name="battle.arena.canAttack ? 'sports_martial_arts' : 'ads_click'" />
            {{
              battle.arena.canAttack
                ? t('fantasy.encounter.enemyInRange')
                : battle.arena.playerHasMoved
                  ? t('fantasy.encounter.movementComplete')
                : t('fantasy.encounter.chooseMovement', { range: battle.arena.playerMovement })
            }}
          </div>
        </div>
        <div class="hex-arena" aria-label="Tactical battlefield">
          <button
            v-for="cell in arenaCells"
            :key="cell"
            type="button"
            class="hex-cell"
            :class="{
              'hex-cell--reachable': reachableCells.has(cell),
              'hex-cell--player': cell === battle.arena.playerPosition,
              'hex-cell--monster': cell === battle.arena.monsterPosition,
              'hex-cell--blocked': battle.arena.blockedCells.includes(cell),
            }"
            :style="cellStyle(cell)"
            :disabled="loading || !reachableCells.has(cell)"
            :aria-label="t('fantasy.encounter.moveToHex', { hex: cell + 1 })"
            @click="moveToCell(cell)"
          >
            <QIcon v-if="battle.arena.blockedCells.includes(cell)" name="landscape" class="terrain-rock" />
          </button>
        </div>
        <div
          class="battle-unit battle-unit--player"
          :style="unitStyle(battle.arena.playerPosition)"
        >
          <img :key="`player-action-${battle.turn}`" src="/images/battle/player-knight.png" alt="" :class="playerAnimationClass" />
        </div>
        <button
          type="button"
          class="battle-unit battle-unit--monster"
          :class="{ 'battle-unit--targetable': battle.arena.canAttack }"
          :style="unitStyle(battle.arena.monsterPosition)"
          :disabled="loading || !battle.arena.canAttack"
          @click="attackEnemy"
        >
          <img :key="`monster-action-${battle.turn}`" :src="monsterImage" alt="" :class="monsterAnimationClass" />
          <span v-if="battle.arena.canAttack" class="melee-target"><QIcon name="gps_fixed" /></span>
        </button>
        <div class="tactical-stat tactical-stat--player">
          <strong>{{ playerName }}</strong>
          <span>{{ battle.player.health }} / {{ battle.player.maxHealth }} HP</span>
          <div><i :style="{ width: `${playerHealthPercent}%` }" /></div>
        </div>
        <div class="tactical-stat tactical-stat--monster">
          <strong>{{ battle.monster.name }}</strong>
          <span>{{ battle.monster.health }} / {{ battle.monster.maxHealth }} HP</span>
          <div><i :style="{ width: `${monsterHealthPercent}%` }" /></div>
        </div>
      </div>

      <div v-else class="battlefield-grid relative grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-7 px-8 py-7">
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

      <div class="min-h-0 flex-1 overflow-y-auto border-t border-[#ddbd6b]/15 bg-[#0b2029]/85 px-6 py-4">
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

      <footer class="flex shrink-0 justify-end gap-3 border-t border-[#ddbd6b]/15 bg-[#081a23] px-6 py-4">
        <button
          v-if="battle.status === 'ACTIVE' && battle.canRetreat"
          class="rounded-lg border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wider text-[#b8cbc6] uppercase hover:bg-white/5 disabled:opacity-50"
          :disabled="loading"
          @click="$emit('retreat')"
        >
          {{ t('fantasy.encounter.retreat') }}
        </button>
        <template v-if="battle.status === 'ACTIVE' && mode === 'choose'">
          <button
            class="rounded-lg border border-[#dfc16d]/45 bg-[#dfc16d]/10 px-6 py-2.5 text-xs font-bold tracking-wider text-[#ffe69a] uppercase hover:bg-[#dfc16d]/20 disabled:opacity-50"
            :disabled="loading"
            @click="startQuickBattle"
          >
            <QIcon name="fast_forward" size="18px" />
            {{ t('fantasy.encounter.quickBattle') }}
          </button>
          <button
            class="rounded-lg bg-[#bd4938] px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg hover:bg-[#d15743] disabled:opacity-50"
            :disabled="loading"
            @click="mode = 'tactical'"
          >
            <QIcon name="stadia_controller" size="18px" />
            {{ t('fantasy.encounter.tacticalBattle') }}
          </button>
        </template>
        <template v-else-if="battle.status === 'ACTIVE' && mode === 'tactical'">
          <button
            class="battle-action battle-action--defend"
            :disabled="loading"
            @click="emit('tactical-action', { action: 'DEFEND' })"
          >
            <QIcon name="shield" size="19px" />{{ t('fantasy.encounter.defend') }}
          </button>
          <button
            class="battle-action battle-action--power"
            :disabled="loading || battle.powerAttackCooldown > 0 || !battle.arena.canAttack"
            @click="emit('tactical-action', { action: 'POWER_ATTACK' })"
          >
            <QIcon name="local_fire_department" size="19px" />
            {{
              battle.powerAttackCooldown > 0
                ? t('fantasy.encounter.powerCooldown', { turns: battle.powerAttackCooldown })
                : t('fantasy.encounter.powerAttack')
            }}
          </button>
          <button
            class="battle-action battle-action--attack"
            :disabled="loading || !battle.arena.canAttack"
            @click="attackEnemy"
          >
            <QIcon name="sports_martial_arts" size="19px" />
            {{ loading ? t('fantasy.encounter.attacking') : t('fantasy.encounter.attack') }}
          </button>
        </template>
        <button
          v-else-if="battle.status === 'ACTIVE'"
          class="rounded-lg bg-[#bd4938] px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg hover:bg-[#d15743] disabled:opacity-50"
          :disabled="loading"
          @click="startQuickBattle"
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
import { getBattleMonsterVisual } from '@/modules/Game/monsterVisual';
import { getRarityTextClass } from '@/modules/Inventory/utils/rarity';
import type { BattleState, TacticalBattleAction } from '@/modules/Monsters/api';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{ battle: BattleState; playerName: string; loading: boolean }>();
const emit = defineEmits<{
  (event: 'quick-battle'): void;
  (event: 'tactical-action', action: TacticalBattleAction): void;
  (event: 'retreat'): void;
  (event: 'close'): void;
}>();
const { t } = useTranslation();
const mode = ref<'choose' | 'quick' | 'tactical'>('choose');

const currentUserStore = useCurrentUserStore();
const itemActions = ref<Record<number, 'dropped' | 'replaced'>>({});
const replacingItemIndex = ref<number | null>(null);
const replacingLootItem = ref<NonNullable<BattleState['rewards']>['items'][number] | null>(null);
const selectedBackpackItem = ref<InventoryItemType | null>(null);
const monsterImage = computed(() => getBattleMonsterVisual(props.battle.monsterType, props.battle.monster.name));
const arenaCells = computed(() => Array.from({ length: props.battle.arena.columns * props.battle.arena.rows }, (_, i) => i));
const reachableCells = computed(() => new Set(props.battle.arena.reachableCells));
const cellGeometry = (cell: number) => {
  const row = Math.floor(cell / props.battle.arena.columns);
  const column = cell % props.battle.arena.columns;
  const rowWidth = 62 + row * 6;
  const cellStep = rowWidth / props.battle.arena.columns;
  const width = cellStep * 1.12;
  const left = (100 - rowWidth) / 2 + column * cellStep + (row % 2) * (cellStep / 2);
  const height = 12 + row * 0.7;
  const top = 31 + row * 10.8;
  return { row, width, height, left, top };
};
const cellStyle = (cell: number) => {
  const geometry = cellGeometry(cell);
  return {
    left: `${geometry.left}%`,
    top: `${geometry.top}%`,
    width: `${geometry.width}%`,
    height: `${geometry.height}%`,
  };
};
const unitStyle = (cell: number) => {
  const geometry = cellGeometry(cell);
  const width = 14 + geometry.row * 0.7;
  const height = 36 + geometry.row * 3.5;
  const footPosition = geometry.top + geometry.height * 0.72;
  return {
    left: `${geometry.left + geometry.width / 2 - width / 2}%`,
    bottom: `${100 - footPosition}%`,
    width: `${width}%`,
    height: `${height}%`,
    zIndex: 20 + geometry.row,
  };
};
const moveToCell = (cell: number) => {
  if (props.loading || !reachableCells.value.has(cell)) return;
  emit('tactical-action', { action: 'MOVE', targetCell: cell });
};
const attackEnemy = () => {
  if (props.loading || !props.battle.arena.canAttack) return;
  emit('tactical-action', { action: 'ATTACK' });
};
const playerHealthPercent = computed(() =>
  Math.max(0, Math.min(100, (props.battle.player.health / props.battle.player.maxHealth) * 100))
);
const monsterHealthPercent = computed(() =>
  Math.max(0, Math.min(100, (props.battle.monster.health / props.battle.monster.maxHealth) * 100))
);
const playerAnimationClass = computed(() => {
  const event = props.battle.events.find((entry) => entry.actor === 'PLAYER');
  if (!event) return '';
  if (event.action === 'MOVE') return '';
  if (event.action === 'DEFEND') return 'unit-defending';
  return event.dodged || event.blocked ? 'unit-missed' : 'unit-attacking';
});
const monsterAnimationClass = computed(() =>
  props.battle.events.some((entry) => entry.actor === 'MONSTER' && entry.action !== 'MOVE') ? 'unit-attacking' : ''
);
const startQuickBattle = () => {
  mode.value = 'quick';
  emit('quick-battle');
};

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
  if (event.action === 'MOVE') {
    return t(event.actor === 'PLAYER' ? 'fantasy.encounter.youMove' : 'fantasy.encounter.enemyMoves');
  }
  if (event.action === 'DEFEND') return t('fantasy.encounter.defendLog');
  const actor = t(`fantasy.encounter.${getBattleEventSubject(event)}`);
  if (event.dodged) return t('fantasy.encounter.dodged', { actor });
  if (event.blocked) return t('fantasy.encounter.blocked', { actor });
  const messageKey =
    event.action === 'POWER_ATTACK'
      ? 'fantasy.encounter.powerHit'
      : event.critical
        ? 'fantasy.encounter.criticalHit'
        : 'fantasy.encounter.hit';
  return t(messageKey, {
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
.tactical-battlefield {
  height: clamp(340px, 48vh, 520px);
  min-height: 340px;
  background:
    linear-gradient(to bottom, rgb(4 17 22 / 4%) 35%, rgb(4 17 22 / 18%) 100%),
    url('/images/battle/tactical-battlefield-v2.png') center / cover no-repeat;
  perspective: 1100px;
}
.battle-haze {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 16% 65%, rgb(35 182 150 / 10%), transparent 20%),
    radial-gradient(circle at 84% 65%, rgb(203 75 49 / 12%), transparent 20%),
    linear-gradient(to top, rgb(4 13 18 / 26%), transparent 42%);
  pointer-events: none;
}
.battle-command-bar {
  position: absolute;
  top: 2.5%;
  right: 2%;
  left: 2%;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.6rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid rgb(239 202 114 / 30%);
  border-radius: 0.75rem;
  color: rgb(226 236 233 / 72%);
  background: linear-gradient(90deg, rgb(5 20 27 / 90%), rgb(13 35 42 / 84%), rgb(5 20 27 / 90%));
  box-shadow: 0 8px 22px rgb(0 0 0 / 30%);
  backdrop-filter: blur(6px);
}
.initiative-ribbon {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  align-items: center;
  gap: 0.25rem;
}
.initiative-unit {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
  padding: 0.28rem 0.45rem;
  border-radius: 0.4rem;
  font-size: 0.62rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.initiative-unit--active {
  color: #ffe39a;
  background: rgb(201 157 54 / 20%);
  box-shadow: inset 0 0 0 1px rgb(255 220 128 / 18%);
}
.hex-arena {
  position: absolute;
  inset: 0;
  z-index: 4;
}
.hex-cell {
  position: absolute;
  border: 0;
  clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
  cursor: default;
  background: rgb(241 220 159 / 3%);
  box-shadow: inset 0 0 0 1px rgb(255 246 211 / 25%);
  filter: drop-shadow(0 1px 0 rgb(32 22 12 / 25%));
  transition: filter 0.16s ease, background 0.16s ease, transform 0.16s ease;
}
.hex-cell::after {
  position: absolute;
  inset: 4px;
  clip-path: inherit;
  content: '';
  background: linear-gradient(145deg, rgb(255 255 255 / 5%), rgb(2 14 18 / 16%));
}
.hex-cell--reachable {
  cursor: pointer;
  background: rgb(31 174 139 / 24%);
  box-shadow: inset 0 0 0 2px rgb(138 255 220 / 65%), 0 0 12px rgb(35 218 165 / 18%);
}
.hex-cell--reachable:hover {
  filter: brightness(1.45);
  transform: translateY(-2px);
}
.hex-cell--player {
  background: rgb(58 179 234 / 34%);
  box-shadow: inset 0 0 0 2px rgb(147 224 255 / 78%), 0 0 18px rgb(51 184 241 / 33%);
}
.hex-cell--monster {
  background: rgb(219 74 49 / 36%);
  box-shadow: inset 0 0 0 2px rgb(255 134 103 / 82%), 0 0 18px rgb(234 63 36 / 36%);
}
.hex-cell--blocked {
  background: rgb(48 54 45 / 48%);
  box-shadow: inset 0 0 0 2px rgb(198 180 125 / 28%);
}
.terrain-rock {
  position: relative;
  z-index: 2;
  color: #9c9881;
  font-size: clamp(1.15rem, 2vw, 2rem);
  filter: drop-shadow(0 3px 2px rgb(0 0 0 / 65%));
}
.battle-unit {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  transform-origin: 50% 100%;
  transition: left 0.48s cubic-bezier(0.2, 0.75, 0.25, 1), bottom 0.48s cubic-bezier(0.2, 0.75, 0.25, 1),
    width 0.48s ease, height 0.48s ease, filter 0.2s ease;
  filter: drop-shadow(0 15px 8px rgb(0 0 0 / 42%));
}
.battle-unit img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.battle-unit--targetable {
  cursor: crosshair;
  filter: drop-shadow(0 0 15px rgb(255 83 56 / 72%)) drop-shadow(0 22px 12px rgb(0 0 0 / 48%));
}
.melee-target {
  position: absolute;
  top: 12%;
  left: 50%;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid rgb(255 177 144 / 70%);
  border-radius: 50%;
  color: white;
  background: rgb(174 48 30 / 84%);
  box-shadow: 0 0 18px rgb(255 70 42 / 65%);
  transform: translateX(-50%);
  animation: target-pulse 1.15s ease-in-out infinite;
}
.tactical-stat {
  position: absolute;
  bottom: 2.5%;
  z-index: 40;
  display: grid;
  width: min(34%, 260px);
  grid-template-columns: 1fr auto;
  gap: 0.2rem 0.6rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgb(239 202 114 / 35%);
  border-radius: 0.65rem;
  color: white;
  background: rgb(5 20 27 / 88%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 38%);
  backdrop-filter: blur(6px);
}
.tactical-stat--player {
  left: 3%;
}
.tactical-stat--monster {
  right: 3%;
  text-align: right;
}
.tactical-stat strong,
.tactical-stat span {
  overflow: hidden;
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tactical-stat span {
  color: #c7d8d4;
}
.tactical-stat > div {
  height: 0.4rem;
  grid-column: 1 / -1;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
}
.tactical-stat i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0aa878, #36e6ae);
  transition: width 0.35s ease;
}
.tactical-stat--monster i {
  margin-left: auto;
  background: linear-gradient(90deg, #f57555, #b72e2e);
}
.turn-standard {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgb(239 202 114 / 38%);
  border-radius: 999px;
  color: #ffe39a;
  background: rgb(201 157 54 / 14%);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.arena-instruction {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
  padding: 0.42rem 0.65rem;
  border-radius: 0.5rem;
  color: #d8e9e4;
  background: transparent;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
}
.battle-action {
  display: inline-flex;
  min-height: 2.65rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.6rem 1rem;
  border-radius: 0.65rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: 0.18s;
}
.battle-action--attack {
  color: white;
  background: #bd4938;
}
.battle-action--defend {
  color: #c9eaff;
  border: 1px solid rgb(125 211 252 / 38%);
  background: rgb(12 74 110 / 35%);
}
.battle-action--power {
  color: #ffe4a3;
  border: 1px solid rgb(251 191 36 / 40%);
  background: rgb(146 64 14 / 35%);
}
.battle-action:hover:not(:disabled) {
  filter: brightness(1.14);
  transform: translateY(-1px);
}
.battle-action:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
.battle-unit img.unit-attacking {
  animation: tactical-strike 0.55s ease-in-out;
}
.battle-unit--monster img.unit-attacking {
  animation-name: tactical-strike-reverse;
}
.battle-unit img.unit-defending {
  animation: tactical-defend 0.65s ease-in-out;
}
.battle-unit img.unit-missed {
  animation: tactical-miss 0.55s ease-in-out;
}
@keyframes tactical-strike {
  0%, 100% { transform: translateX(0) rotateY(0); }
  48% { transform: translateX(34%) rotateY(-8deg) scale(1.05); }
}
@keyframes tactical-strike-reverse {
  0%, 100% { transform: translateX(0) rotateY(0); }
  48% { transform: translateX(-34%) rotateY(8deg) scale(1.05); }
}
@keyframes tactical-defend {
  0%, 100% { filter: drop-shadow(0 22px 12px rgb(0 0 0 / 48%)); }
  50% { filter: drop-shadow(0 0 18px rgb(83 197 255 / 88%)); transform: scale(0.96); }
}
@keyframes tactical-miss {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(12%); opacity: 0.72; }
}
@keyframes target-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.15); }
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
@media (max-width: 640px) {
  .tactical-battlefield {
    height: 340px;
  }
  .battle-command-bar {
    justify-content: center;
  }
  .tactical-stat {
    width: 43%;
  }
  .initiative-ribbon,
  .arena-instruction {
    display: none;
  }
}
</style>
