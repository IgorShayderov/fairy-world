<template>
  <div class="absolute inset-0 z-40 overflow-y-auto bg-[#06141d]/96 p-3 text-slate-100 backdrop-blur-sm sm:p-4">
    <div class="mx-auto max-w-7xl">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-[#806f43]/60 pb-3">
        <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">
            {{ t('fantasy.dungeonRun.eyebrow') }}
          </p>
          <h2 class="font-serif text-2xl font-semibold text-[#fff0bd] sm:text-3xl">{{ battle.dungeon }}</h2>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-3">
          <p class="rounded-full border border-[#35515b] bg-[#0d2934] px-3 py-1.5 text-xs text-[#a9bfba]">
            {{ t('fantasy.dungeonRun.progress', { defeated: defeatedCount, total: 4 }) }}
          </p>
          <div v-if="battle.party" class="flex flex-wrap justify-end gap-2">
            <div
              v-for="member in battle.party.members"
              :key="member.profileId"
              class="min-w-48 rounded-xl border border-[#35515b] bg-[#0d2934] px-3 py-2 text-[11px] text-[#d6e1de]"
            >
              <div class="flex justify-between gap-3">
                <strong>{{ member.name }}</strong>
                <span class="text-[#a9bfba]">{{ t('fantasy.encounter.level', { level: member.level }) }}</span>
              </div>
              <div class="mt-1 flex justify-between text-[#a9bfba]">
                <span>HP</span><span>{{ member.health ?? 0 }} / {{ member.maxHealth ?? 0 }}</span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-[#06151d]">
                <div class="h-full bg-emerald-500" :style="{ width: `${memberHealthPercent(member)}%` }" />
              </div>
              <div class="mt-1.5 flex justify-between text-[#8fbce5]">
                <span>{{ t('fantasy.dungeonRun.mana') }}</span
                ><span>{{ member.mana ?? 0 }} / {{ member.maxMana ?? 0 }}</span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-[#06151d]">
                <div class="h-full bg-sky-500" :style="{ width: `${memberManaPercent(member)}%` }" />
              </div>
            </div>
          </div>
          <div v-else class="min-w-56 rounded-xl border border-[#35515b] bg-[#0d2934] px-4 py-2.5">
            <div class="flex justify-between text-xs text-[#a9bfba]">
              <span>{{ playerName }}</span>
              <span>{{ battle.player.health }} / {{ battle.player.maxHealth }} HP</span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#06151d]">
              <div
                class="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all"
                :style="{ width: `${playerHealthPercent}%` }"
              />
            </div>
          </div>
          <button
            v-if="battle.status === 'ACTIVE'"
            type="button"
            class="rounded-lg border border-red-400/45 bg-red-950/40 px-4 py-2 text-xs font-bold tracking-wide text-red-200 uppercase transition hover:bg-red-900/60 disabled:opacity-40"
            :disabled="loading"
            @click="showLeaveConfirmation = true"
          >
            {{ t('fantasy.dungeonRun.leave') }}
          </button>
        </div>
      </header>

      <section
        class="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-3"
      >
        <div class="mr-auto">
          <div class="text-xs font-bold tracking-[0.14em] text-red-200 uppercase">
            {{ t('fantasy.dungeonRun.healthPotions') }}
          </div>
          <p class="mt-0.5 text-xs text-[#a9bfba]">{{ t('fantasy.dungeonRun.healthDoesNotRestore') }}</p>
        </div>
        <button
          v-for="entry in healthPotions"
          :key="entry.id"
          type="button"
          class="flex items-center gap-2 rounded-lg border border-red-300/30 bg-[#0d2934] px-3 py-2 text-left text-xs text-[#f4d9d5] transition hover:border-red-300/60 hover:bg-red-950/45 disabled:cursor-not-allowed disabled:opacity-35"
          :disabled="loading || currentMemberHealthFull"
          @click="$emit('use-potion', entry.id)"
        >
          <PotionIcon :name="entry.item.name" class="h-8 w-8 shrink-0" />
          <span>
            <strong class="block">{{ entry.item.name }} ×{{ entry.quantity }}</strong>
            <span class="text-red-200">+{{ getHealthPotionRestore(entry.item.name) }} HP</span>
          </span>
        </button>
        <span v-if="!healthPotions.length" class="text-xs text-[#92aaa5] italic">
          {{ t('fantasy.dungeonRun.noHealthPotions') }}
        </span>
      </section>

      <section class="mt-5 flex h-50 flex-col rounded-xl border border-[#35515b] bg-[#0b2029]/90 px-5 py-4 shadow-xl">
        <h3 class="text-xs font-bold tracking-[0.16em] text-[#efca72] uppercase">
          {{ t('fantasy.encounter.combatLog') }}
        </h3>
        <div ref="combatLogRef" class="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto text-sm text-[#d6e1de]">
          <div v-for="(event, index) in battle.latestEvents" :key="index">
            {{ eventText(event) }}
          </div>
          <p v-if="!battle.latestEvents.length" class="text-[#92aaa5]">{{ t('fantasy.encounter.chooseAction') }}</p>
        </div>
        <div
          v-if="battle.lastBattleResult"
          class="mt-3 border-t border-[#35515b] pt-3 text-sm font-bold"
          :class="battle.lastBattleResult.winner === 'PLAYER' ? 'text-emerald-300' : 'text-red-300'"
        >
          {{ t('fantasy.dungeonRun.battleWinner', { winner: battle.lastBattleResult.winnerName }) }}
        </div>
      </section>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="opponent in battle.opponents"
          :key="opponent.id"
          class="group relative overflow-hidden rounded-xl border bg-[#0b2530] shadow-xl transition"
          :class="cardClass(opponent.status, opponent.isBoss)"
        >
          <div class="relative aspect-[4/3] overflow-hidden bg-[#071923]">
            <img
              :src="opponent.image"
              :alt="opponent.monster.name"
              class="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
              :class="opponent.status === 'DEFEATED' ? 'grayscale' : ''"
            />
            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#071923] to-transparent" />
            <span
              v-if="opponent.isBoss"
              class="absolute top-3 left-3 rounded-full border border-amber-300/50 bg-[#251807]/90 px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-200 uppercase"
            >
              {{ t('fantasy.dungeonRun.boss') }}
            </span>
            <div
              v-if="opponent.status !== 'AVAILABLE'"
              class="absolute inset-0 flex items-center justify-center bg-[#02080d]/60 text-center font-bold tracking-widest uppercase"
              :class="opponent.status === 'DEFEATED' ? 'text-emerald-300' : 'text-amber-200'"
            >
              {{ t(`fantasy.dungeonRun.${opponent.status.toLowerCase()}`) }}
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <h3 class="font-serif text-lg leading-tight font-semibold text-[#fff0bd]">{{ opponent.monster.name }}</h3>
              <span class="shrink-0 text-xs text-[#efca72]">{{
                t('fantasy.encounter.level', { level: opponent.monster.level })
              }}</span>
            </div>
            <div class="mt-3">
              <div class="flex items-center justify-between text-xs text-[#c4d2cf]">
                <span>{{ t('fantasy.dungeonRun.health') }}</span>
                <span>{{ opponent.monster.health }} / {{ opponent.monster.maxHealth }} HP</span>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-[#06151d]">
                <div
                  class="h-full bg-gradient-to-r from-red-800 to-red-400 transition-[width] duration-300"
                  :style="{ width: `${monsterHealthPercent(opponent)}%` }"
                />
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-[#a9bfba]">
              <span>{{ t('fantasy.dungeonRun.damage') }}: {{ opponent.monster.damage }}</span>
              <span>{{ t('fantasy.dungeonRun.defense') }}: {{ formatNumber(opponent.monster.defense) }}%</span>
              <span>{{ t('fantasy.dungeonRun.critical') }}: {{ formatNumber(opponent.monster.criticalChance) }}%</span>
            </div>
            <button
              v-if="battle.status === 'ACTIVE'"
              type="button"
              class="mt-4 w-full rounded-lg bg-[#c5963e] px-4 py-2 text-sm font-bold text-[#081820] transition hover:bg-[#e1bb65] disabled:cursor-not-allowed disabled:opacity-35"
              :disabled="loading || opponent.status !== 'AVAILABLE' || currentMemberDefeated"
              @click="$emit('attack', opponent.id)"
            >
              {{ loading ? t('fantasy.encounter.attacking') : t('fantasy.dungeonRun.fight') }}
            </button>
          </div>
        </article>
      </div>

      <p v-if="battle.status === 'ACTIVE' && currentMemberDefeated" class="mt-4 text-sm font-semibold text-red-300">
        {{ t('fantasy.dungeonRun.cannotAttackWithoutHealth') }}
      </p>

      <div
        v-if="battle.lastExperience > 0 && battle.status === 'ACTIVE'"
        class="mt-4 rounded-lg border border-sky-400/25 bg-sky-950/35 px-4 py-3 text-sm text-sky-200"
      >
        {{ t('fantasy.dungeonRun.experienceEarned', { experience: battle.lastExperience }) }}
      </div>

      <section
        v-if="battle.status === 'DEFEAT'"
        class="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-red-400/40 bg-red-950/35 p-5"
      >
        <div class="mr-auto">
          <p class="text-xs font-bold tracking-[0.2em] text-red-300 uppercase">
            {{ t('fantasy.dungeonRun.defeatedTitle') }}
          </p>
          <p class="mt-2 text-sm text-[#d6e1de]">{{ t('fantasy.dungeonRun.defeatedMessage') }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-red-300/45 bg-red-950/40 px-5 py-2.5 text-sm font-bold text-red-100 hover:bg-red-900/55"
          @click="$emit('close')"
        >
          {{ t('fantasy.encounter.returnToMap') }}
        </button>
      </section>

      <section
        v-if="battle.status === 'VICTORY' && battle.rewards"
        ref="rewardSectionRef"
        class="mt-5 rounded-xl border border-[#d8bd75]/40 bg-[#102d35] p-5"
      >
        <p class="text-xs font-bold tracking-[0.2em] text-[#efca72] uppercase">
          {{ t('fantasy.dungeonRun.completed') }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-5">
          <div class="min-w-48">
            <strong class="block text-xl text-[#fff0bd]">
              {{
                t(battle.party ? 'fantasy.dungeonRun.goldShare' : 'fantasy.dungeonRun.goldReward', {
                  gold: battle.rewards.gold,
                })
              }}
            </strong>
            <span class="mt-1 block text-sm text-sky-200">
              {{ t('fantasy.dungeonRun.totalExperienceReward', { experience: battle.rewards.experience }) }}
            </span>
          </div>
          <template v-if="battle.partyLoot">
            <button
              v-for="item in battle.partyLoot.items"
              :key="item.id"
              type="button"
              class="relative flex items-center gap-3 rounded-lg border bg-[#071923] p-3 text-left transition"
              :class="isLootSelected(item.id) ? 'border-emerald-400 ring-1 ring-emerald-400/50' : 'border-[#806f43]/50'"
              :disabled="lootSubmitted || battle.partyLoot.status === 'RESOLVED'"
              @click="toggleLoot(item.id)"
            >
              <span
                v-if="isLootSelected(item.id)"
                class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-[#06141d]"
                >✓</span
              >
              <InventoryItem
                :item="lootInventoryItem(item)"
                :comparison-item="equippedItemForLoot(item)"
                :slot-id="''"
                class="h-14 w-14 shrink-0 !border-0 !bg-transparent !p-0 !shadow-none"
              />
              <span>
                <span class="block font-semibold text-[#fff0bd]">{{ item.name }}</span>
                <span class="text-xs font-bold uppercase" :class="rarityClass(item.rarity)">{{ item.rarity }}</span>
                <span v-if="item.winnerName" class="mt-1 block text-xs text-emerald-300">
                  {{ t('fantasy.dungeonRun.lootWonBy', { player: item.winnerName }) }}
                </span>
              </span>
            </button>
            <div v-if="battle.partyLoot.status === 'CHOOSING'" class="basis-full rounded-lg bg-[#071923]/70 p-3">
              <p class="text-sm text-[#c7d6d2]">
                {{
                  lootSecondsLeft <= 0
                    ? t('fantasy.dungeonRun.resolvingLoot')
                    : lootSubmitted
                      ? t('fantasy.dungeonRun.waitingForLoot')
                      : t('fantasy.dungeonRun.chooseLoot')
                }}
              </p>
              <p class="mt-2 text-xs font-bold text-[#efca72]">
                {{ t('fantasy.dungeonRun.lootTimeLeft', { seconds: lootSecondsLeft }) }}
              </p>
              <button
                v-if="!lootSubmitted"
                type="button"
                class="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                :disabled="loading || lootSecondsLeft <= 0"
                @click="$emit('submit-loot', selectedLootIds)"
              >
                {{ t('fantasy.dungeonRun.confirmLoot') }}
              </button>
            </div>
          </template>
          <template v-else>
            <div
              v-for="item in battle.rewards.items"
              :key="item.inventoryItemId ?? item.id"
              class="flex items-center gap-3 rounded-lg border border-[#806f43]/50 bg-[#071923] p-3"
            >
              <InventoryItem
                :item="lootInventoryItem(item)"
                :comparison-item="equippedItemForLoot(item)"
                :slot-id="''"
                class="h-14 w-14 shrink-0 !border-0 !bg-transparent !p-0 !shadow-none"
              />
              <div>
                <div class="font-semibold text-[#fff0bd]">{{ item.name }}</div>
                <div class="text-xs font-bold uppercase" :class="rarityClass(item.rarity)">{{ item.rarity }}</div>
                <div v-if="item.inventoryFull" class="mt-1 text-xs text-red-300">
                  {{ t('fantasy.encounter.inventoryFullLootNotice') }}
                </div>
              </div>
            </div>
          </template>
        </div>
        <section v-if="battle.rewards.craftItems.length" class="mt-5 border-t border-[#806f43]/35 pt-4">
          <p class="text-xs font-bold tracking-[0.16em] text-[#efca72] uppercase">
            {{ t('fantasy.dungeonRun.craftingMaterials') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-4">
            <div
              v-for="material in battle.rewards.craftItems"
              :key="material.id"
              class="flex items-center gap-2 rounded-lg border border-[#806f43]/50 bg-[#071923] p-3"
            >
              <img :src="`/icons/items/${material.icon}`" alt="" class="h-12 w-12 object-contain" />
              <div>
                <div class="text-[10px] font-bold tracking-wider text-[#efca72] uppercase">
                  {{ t('crafting.materialDrop') }}
                </div>
                <div class="text-sm font-semibold text-[#fff0bd]">{{ material.name }} ×{{ material.quantity }}</div>
              </div>
            </div>
          </div>
        </section>
        <div class="mt-5 flex justify-end">
          <button
            v-if="battle.partyLoot?.status !== 'CHOOSING'"
            class="rounded-lg border border-[#d8bd75]/50 px-4 py-2 text-sm text-[#fff0bd] hover:bg-white/5"
            @click="$emit('close')"
          >
            {{ t('fantasy.encounter.returnToMap') }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="showLeaveConfirmation"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="t('fantasy.dungeonRun.leaveTitle')"
      @click.self="showLeaveConfirmation = false"
    >
      <section class="w-full max-w-md rounded-2xl border border-red-400/45 bg-[#0b2530] p-6 shadow-2xl">
        <h3 class="font-serif text-2xl font-semibold text-[#fff0bd]">
          {{ t('fantasy.dungeonRun.leaveTitle') }}
        </h3>
        <p class="mt-3 text-sm leading-6 text-[#c7d6d2]">
          {{ t('fantasy.dungeonRun.leaveWarning') }}
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-[#d8bd75]/45 px-4 py-2 text-sm text-[#fff0bd] hover:bg-white/5"
            :disabled="loading"
            @click="showLeaveConfirmation = false"
          >
            {{ t('fantasy.dungeonRun.stay') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
            :disabled="loading"
            @click="confirmLeave"
          >
            {{ t('fantasy.dungeonRun.confirmLeave') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getBattleEventSubject } from '@/modules/Game/battleEvent';
import { findEquippedItemForEntries } from '@/modules/Inventory/utils/equipment';
import { getHealthPotionRestore } from '@/modules/Inventory/utils/potions';
import type { DungeonOpponentStatus, DungeonPartyMember, DungeonRunState } from '@/modules/Monsters/api';

import PotionIcon from '@/modules/Inventory/components/icons/PotionIcon.vue';
import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';

const props = defineProps<{ battle: DungeonRunState; playerName: string; loading: boolean }>();
const emit = defineEmits<{
  (event: 'attack', opponentId: string): void;
  (event: 'use-potion', inventoryItemId: number): void;
  (event: 'leave'): void;
  (event: 'close'): void;
  (event: 'submit-loot', itemIds: number[]): void;
}>();

const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();
type DungeonLootItem =
  NonNullable<DungeonRunState['rewards']>['items'][number] | NonNullable<DungeonRunState['partyLoot']>['items'][number];
const lootInventoryItem = (item: DungeonLootItem): InventoryItemType => ({
  id: item.id,
  level: item.level,
  requiredPlayerLevel: item.requiredPlayerLevel,
  nameKey: item.name,
  name: item.name,
  tooltipName: item.name,
  icon: item.icon,
  description: item.description,
  price: item.price,
  rarity: t(`profile.rarity.${item.rarity.toLowerCase()}`),
  rarityKey: item.rarity,
  equipmentType: item.equipmentType,
  isTwoHanded: item.isTwoHanded,
  attributes: item.attributes,
  properties: item.properties,
  quantity: item.quantity,
});
const equippedItemForLoot = (item: DungeonLootItem) =>
  findEquippedItemForEntries(
    (currentUserStore.user?.inventory ?? []).filter(({ isEquiped }) => isEquiped),
    item,
    undefined,
    (rarity) => t(`profile.rarity.${rarity.toLowerCase()}`)
  );
const healthPotions = computed(() =>
  (currentUserStore.user?.inventory ?? []).filter(({ item }) => item.name.includes('Health Potion'))
);
const showLeaveConfirmation = ref(false);
const combatLogRef = ref<HTMLElement | null>(null);
const rewardSectionRef = ref<HTMLElement | null>(null);
const selectedLootIds = ref<number[]>([]);
const lootSecondsLeft = ref(0);
let lootCountdownTimer: ReturnType<typeof setInterval> | undefined;
const updateLootCountdown = () => {
  const deadline = props.battle.partyLoot?.deadlineAt;
  lootSecondsLeft.value = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0;
};
const scrollCombatLogToLatest = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    const log = combatLogRef.value;
    if (log) log.scrollTop = log.scrollHeight;
  });
};
onMounted(async () => {
  updateLootCountdown();
  lootCountdownTimer = setInterval(updateLootCountdown, 250);
  await scrollCombatLogToLatest();
});
onUnmounted(() => {
  if (lootCountdownTimer) clearInterval(lootCountdownTimer);
});
watch(() => props.battle.partyLoot?.deadlineAt, updateLootCountdown);
const scrollToRewards = () => rewardSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
watch(() => props.battle.latestEvents, scrollCombatLogToLatest, { deep: true, flush: 'post' });
watch(
  () => props.battle.status,
  async (status, previousStatus) => {
    if (status !== 'VICTORY' || previousStatus === 'VICTORY') return;
    await nextTick();
    scrollToRewards();
  }
);
const confirmLeave = () => {
  showLeaveConfirmation.value = false;
  emit('leave');
};
const defeatedCount = computed(() => props.battle.opponents.filter(({ status }) => status === 'DEFEATED').length);
const playerHealthPercent = computed(() =>
  Math.max(0, Math.min(100, (props.battle.player.health / props.battle.player.maxHealth) * 100))
);
const currentPartyMember = computed(() =>
  props.battle.party?.members.find(({ userId }) => userId === currentUserStore.user?.id)
);
const lootSubmitted = computed(() =>
  currentPartyMember.value
    ? (props.battle.partyLoot?.submittedProfileIds.includes(currentPartyMember.value.profileId) ?? false)
    : false
);
const isLootSelected = (itemId: number) => {
  if (selectedLootIds.value.includes(itemId)) return true;
  const profileId = currentPartyMember.value?.profileId;
  return profileId
    ? (props.battle.partyLoot?.items.find(({ id }) => id === itemId)?.claimantProfileIds.includes(profileId) ?? false)
    : false;
};
const toggleLoot = (itemId: number) => {
  selectedLootIds.value = isLootSelected(itemId)
    ? selectedLootIds.value.filter((selectedId) => selectedId !== itemId)
    : [...selectedLootIds.value, itemId];
};
const currentMemberHealthFull = computed(() => {
  const member = currentPartyMember.value;
  return member
    ? (member.health ?? 0) >= (member.maxHealth ?? 0)
    : props.battle.player.health >= props.battle.player.maxHealth;
});
const currentMemberDefeated = computed(() =>
  currentPartyMember.value ? (currentPartyMember.value.health ?? 0) <= 0 : props.battle.player.health <= 0
);
const percentage = (value: number | undefined, maximum: number | undefined) =>
  maximum ? Math.max(0, Math.min(100, ((value ?? 0) / maximum) * 100)) : 0;
const memberHealthPercent = (member: DungeonPartyMember) => percentage(member.health, member.maxHealth);
const memberManaPercent = (member: DungeonPartyMember) => percentage(member.mana, member.maxMana);
const monsterHealthPercent = (opponent: DungeonRunState['opponents'][number]) =>
  Math.max(0, Math.min(100, (opponent.monster.health / opponent.monster.maxHealth) * 100));
const eventText = (event: DungeonRunState['latestEvents'][number]) => {
  if (props.battle.party) {
    if (event.dodged) {
      const subject = event.actor === 'MONSTER' && event.targetName ? event.targetName : t('fantasy.encounter.enemy');
      return t('fantasy.encounter.dodged', { actor: subject });
    }
    const actor = event.actorName ?? t('fantasy.encounter.enemy');
    if (event.targetName) {
      return t(event.critical ? 'fantasy.encounter.criticalHitTarget' : 'fantasy.encounter.hitTarget', {
        actor,
        target: event.targetName,
        damage: event.damage,
      });
    }
    return t(event.critical ? 'fantasy.encounter.criticalHit' : 'fantasy.encounter.hit', {
      actor,
      damage: event.damage,
    });
  }
  const actor = t(`fantasy.encounter.${getBattleEventSubject(event)}`);
  if (event.dodged) return t('fantasy.encounter.dodged', { actor });
  return t(event.critical ? 'fantasy.encounter.criticalHit' : 'fantasy.encounter.hit', {
    actor,
    damage: event.damage,
  });
};
const formatNumber = (value: number) => Math.round(value * 10) / 10;
const cardClass = (status: DungeonOpponentStatus, isBoss: boolean) => ({
  'border-amber-300/45': isBoss && status !== 'DEFEATED',
  'border-[#35515b]': !isBoss && status !== 'DEFEATED',
  'border-emerald-500/35 opacity-75': status === 'DEFEATED',
});
const rarityClass = (rarity: string) => (rarity === 'UNIQUE' ? 'text-orange-300' : 'text-violet-300');
</script>
