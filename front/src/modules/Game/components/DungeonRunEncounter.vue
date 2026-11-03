<template>
  <div class="dungeon-shell absolute inset-0 z-40 bg-[#06141d]/96 p-2 text-slate-100">
    <div class="dungeon-panel">
      <header class="dungeon-heading">
        <h2>{{ battle.dungeon }}</h2>
        <span>Wave {{ Math.min(defeatedCount + 1, 4) }} / 4 · Turn {{ battle.tactical?.turn ?? 1 }}</span>
        <button v-if="battle.status === 'ACTIVE'" :disabled="loading" @click="showLeaveConfirmation = true">
          Leave dungeon
        </button>
      </header>
      <div class="dungeon-field relative min-h-0 flex-1 overflow-hidden">
        <Battlefield3D
          :battle="sceneBattle"
          :disabled="loading || currentMemberDefeated || battle.status !== 'ACTIVE'"
          :hand-mode="loadout.handMode"
          :mage-staff="loadout.primaryWeapon === 'STAFF'"
          @busy="onSceneBusy"
          @move="act({ action: 'MOVE', targetCell: $event })"
          @ready="sceneReady = true"
          @attack="act({ action: 'ATTACK' })"
          @fallback="
            sceneFailed = true;
            sceneReady = true;
            animating = false;
          "
        />
        <div class="dungeon-vitals">
          <div>
            <strong>{{ playerName }}</strong
            ><span>{{ controlsBattle.player.health }} / {{ controlsBattle.player.maxHealth }} HP</span>
            <progress :value="controlsBattle.player.health" :max="controlsBattle.player.maxHealth" />
            <span class="text-[#efca72]"
              >Attack range: {{ (controlsBattle.arena.playerAttackRange ?? 1) > 1 ? 'unlimited' : '1 hex' }}</span
            >
            <template v-if="battle.skills"
              ><span class="text-sky-200">Mana {{ battle.skills.mana }} / {{ battle.skills.maxMana }}</span
              ><progress class="mana" :value="battle.skills.mana" :max="battle.skills.maxMana"
            /></template>
          </div>
          <div>
            <strong>{{ controlsBattle.monster.name }}</strong
            ><span>{{ controlsBattle.monster.health }} / {{ controlsBattle.monster.maxHealth }} HP</span
            ><progress class="enemy" :value="controlsBattle.monster.health" :max="controlsBattle.monster.maxHealth" />
            <span>Movement: {{ controlsBattle.monster.movement }}</span>
            <span v-if="controlsBattle.monster.attackStyle === 'RANGED'">Ranged attacks</span>
            <span v-if="controlsBattle.monster.rangedSkill"
              >{{ controlsBattle.monster.rangedSkill.name }} ·
              {{
                controlsBattle.monster.rangedSkill.cooldown
                  ? `in ${controlsBattle.monster.rangedSkill.cooldown} turns`
                  : 'ready'
              }}</span
            >
            <CombatStatusBadges :statuses="controlsBattle.monster.statuses" />
          </div>
        </div>
        <details class="dungeon-scores" aria-label="Dungeon damage contributions">
          <summary>Damage dealt</summary>
          <div v-for="score in damageScores" :key="score.id">
            <span>{{ score.name }}</span
            ><strong>{{ score.damage }}</strong>
          </div>
        </details>
        <div v-if="battle.status === 'ACTIVE'" class="combat-hud">
          <div class="combat-hud-log" aria-live="polite">
            <div v-for="(event, index) in battle.latestEvents.slice(-2)" :key="index">{{ eventText(event) }}</div>
          </div>
          <div class="combat-hud-tools">
            <PotionQuickSlots
              :used-this-turn="battle.potionUsedThisTurn"
              :disabled="loading || currentMemberHealthFull || currentMemberDefeated"
              @drink="$emit('use-potion', $event)"
            />
            <BattleSkillBar
              v-if="battle.skills?.abilities.length"
              :skills="battle.skills"
              :disabled="loading || currentMemberDefeated"
              @cast="castSkill"
            />
          </div>
        </div>
        <div v-if="battle.status !== 'ACTIVE' && !animating" class="dungeon-results">
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
                  :class="
                    isLootSelected(item.id) ? 'border-emerald-400 ring-1 ring-emerald-400/50' : 'border-[#806f43]/50'
                  "
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
      </div>
      <footer v-if="battle.status === 'ACTIVE'" class="dungeon-actions">
        <span id="dungeon-attack-range">{{ dungeonAttackHint(controlsBattle) }}</span>
        <select
          v-if="sceneFailed"
          aria-label="Move to hex"
          :disabled="loading"
          @change="act({ action: 'MOVE', targetCell: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option>Choose destination</option>
          <option v-for="cell in controlsBattle.arena.reachableCells" :key="cell" :value="cell">Hex {{ cell }}</option>
        </select>
        <button :disabled="loading || currentMemberDefeated" @click="act({ action: 'DEFEND' })">
          Defend / End turn
        </button>
        <button
          class="attack-button"
          :title="dungeonAttackHint(controlsBattle)"
          aria-describedby="dungeon-attack-range"
          :disabled="loading || !controlsBattle.arena.canAttack || currentMemberDefeated"
          @click="act({ action: 'ATTACK' })"
        >
          Attack
        </button>
      </footer>
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
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue';

import type { InventoryItemType } from '@/modules/Inventory/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getBattleEventSubject } from '@/modules/Game/battleEvent';
import { findEquippedItemForEntries } from '@/modules/Inventory/utils/equipment';
import type { DungeonRunState, TacticalBattleAction } from '@/modules/Monsters/api';

const Battlefield3D = defineAsyncComponent(() => import('./Battlefield3D.vue'));
import BattleSkillBar from './BattleSkillBar.vue';
import CombatStatusBadges from './CombatStatusBadges.vue';
import PotionQuickSlots from './PotionQuickSlots.vue';

import { getBattlePlayerLoadout } from '../battlePlayerLoadout';
import { dungeonAttackHint, dungeonBattle, dungeonReplay } from '../dungeonBattle';

import InventoryItem from '@/modules/Inventory/components/InventoryItem.vue';
import './combatHud.css';

const props = defineProps<{ battle: DungeonRunState; playerName: string; loading: boolean }>();
const emit = defineEmits<{
  (event: 'attack', opponentId: string, skillId?: string, command?: TacticalBattleAction): void;
  (event: 'use-potion', inventoryItemId: number): void;
  (event: 'leave'): void;
  (event: 'close'): void;
  (event: 'submit-loot', itemIds: number[]): void;
}>();

const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();
const animating = ref(false);
const sceneFailed = ref(false);
const sceneReady = ref(false);
const loading = computed(() => props.loading || animating.value || !sceneReady.value);
const loadout = computed(() => getBattlePlayerLoadout(currentUserStore.user?.equippedItems));
const controlsBattle = computed(() => dungeonBattle(props.battle, currentUserStore.user?.id));
const sceneBattle = ref(dungeonBattle(props.battle, currentUserStore.user?.id));
let showingExchange = false;
watch(
  () => props.battle,
  (next, previous) => {
    if (
      next.status !== 'ACTIVE' &&
      previous.status === next.status &&
      next.tactical?.revision === previous.tactical?.revision
    )
      return;
    const replay = dungeonReplay(next, previous, currentUserStore.user?.id);
    if (replay) {
      showingExchange = true;
      sceneBattle.value = replay;
    } else if (!animating.value) sceneBattle.value = dungeonBattle(next, currentUserStore.user?.id);
  }
);
function onSceneBusy(value: boolean) {
  animating.value = value;
  if (!value && showingExchange) {
    showingExchange = false;
    if (props.battle.status === 'ACTIVE') sceneBattle.value = controlsBattle.value;
  }
}
function act(command: TacticalBattleAction) {
  if (loading.value || props.battle.status !== 'ACTIVE' || currentMemberDefeated.value) return;
  const opponentId =
    props.battle.tactical?.opponentId ?? props.battle.opponents.find((o) => o.status === 'AVAILABLE')?.id;
  if (opponentId) emit('attack', opponentId, command.skillId, command);
}
const damageScores = computed(() => {
  const scores = props.battle.damageDealt ?? {};
  return (
    props.battle.party?.members.map((member) => ({
      id: member.profileId,
      name: member.name,
      damage: scores[String(member.profileId)]?.damage ?? 0,
    })) ?? [
      { id: 0, name: props.playerName, damage: Object.values(scores).reduce((sum, score) => sum + score.damage, 0) },
    ]
  );
});
const castSkill = (skillId: string) => {
  act({ action: 'SKILL', skillId });
};
type DungeonLootItem =
  NonNullable<DungeonRunState['rewards']>['items'][number] | NonNullable<DungeonRunState['partyLoot']>['items'][number];
const lootInventoryItem = (item: DungeonLootItem): InventoryItemType => ({
  id: item.id,
  ...(item.level !== undefined ? { level: item.level } : {}),
  ...(item.requiredPlayerLevel !== undefined ? { requiredPlayerLevel: item.requiredPlayerLevel } : {}),
  nameKey: item.name,
  name: item.name,
  tooltipName: item.name,
  icon: item.icon,
  description: item.description,
  price: item.price,
  rarity: t(`profile.rarity.${item.rarity.toLowerCase()}`),
  rarityKey: item.rarity,
  equipmentType: item.equipmentType,
  ...(item.isTwoHanded !== undefined ? { isTwoHanded: item.isTwoHanded } : {}),
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
const showLeaveConfirmation = ref(false);
const selectedLootIds = ref<number[]>([]);
const lootSecondsLeft = ref(0);
let lootCountdownTimer: ReturnType<typeof setInterval> | undefined;
const updateLootCountdown = () => {
  const deadline = props.battle.partyLoot?.deadlineAt;
  lootSecondsLeft.value = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0;
};
onMounted(() => {
  updateLootCountdown();
  lootCountdownTimer = setInterval(updateLootCountdown, 250);
});
onUnmounted(() => {
  if (lootCountdownTimer) clearInterval(lootCountdownTimer);
});
watch(() => props.battle.partyLoot?.deadlineAt, updateLootCountdown);
const confirmLeave = () => {
  showLeaveConfirmation.value = false;
  emit('leave');
};
const defeatedCount = computed(() => props.battle.opponents.filter(({ status }) => status === 'DEFEATED').length);
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
const eventText = (event: DungeonRunState['latestEvents'][number]) => {
  if (event.effect === 'empower') return `${event.actorName ?? 'Enemy'} — ${event.skillName}: ${event.statusText}`;
  if (event.statusText)
    return `${event.skillName ? `${event.skillName}: ${event.damage} damage. ` : ''}${event.statusText}`;
  if (event.action === 'MOVE')
    return `${event.actorName ?? (event.actor === 'PLAYER' ? props.playerName : 'Enemy')} moves to hex ${event.toCell}.`;
  if (event.action === 'DEFEND') return `${event.actorName ?? props.playerName} takes a defensive stance.`;
  if (event.skillName)
    return `${event.actorName ?? props.playerName} — ${event.skillName}: ${event.healing !== undefined ? `+${event.healing} HP` : event.dodged ? 'dodged' : event.blocked ? 'blocked' : `${event.damage} damage`}.`;
  if (props.battle.party) {
    if (event.dodged) {
      const subject = event.actor === 'MONSTER' && event.targetName ? event.targetName : t('fantasy.encounter.enemy');
      return t('fantasy.encounter.dodged', { actor: subject });
    }
    if (event.blocked) {
      const target = event.targetName ?? t('fantasy.encounter.party');
      const actor = event.actorName ?? t('fantasy.encounter.enemy');
      return t('fantasy.encounter.blockedTarget', { actor, target });
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
  if (event.blocked) return t('fantasy.encounter.blocked', { actor });
  return t(event.critical ? 'fantasy.encounter.criticalHit' : 'fantasy.encounter.hit', {
    actor,
    damage: event.damage,
  });
};
const rarityClass = (rarity: string) => (rarity === 'UNIQUE' ? 'text-orange-300' : 'text-violet-300');
</script>

<style scoped>
.dungeon-shell {
  overflow: hidden;
}
.dungeon-panel {
  height: 100%;
  max-width: 1800px;
  margin: auto;
  display: flex;
  flex-direction: column;
  border: 1px solid #806f43;
  border-radius: 14px;
  overflow: hidden;
}
.dungeon-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: #102831;
  flex-shrink: 0;
}
.dungeon-heading h2 {
  font-family: Georgia, serif;
  font-size: 20px;
  color: #fff0bd;
  margin: 0;
  line-height: 1.3;
}
.dungeon-heading span {
  font-size: 12px;
  color: #cfb77c;
}
.dungeon-heading button {
  margin-left: auto;
  color: #dfb9ac;
  font-size: 12px;
}
.dungeon-field {
  background: #172724;
}
.dungeon-vitals {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}
.dungeon-vitals > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: #071a22e8;
  border: 1px solid #7d704e;
  border-radius: 9px;
  padding: 8px 12px;
  width: min(36%, 300px);
  font-size: 12px;
}
.dungeon-vitals strong {
  color: #f5e4b5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
progress {
  width: 100%;
  height: 5px;
  appearance: none;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
}
progress::-webkit-progress-bar {
  background: #020e12;
}
progress::-webkit-progress-value {
  background: #22c89f;
}
progress::-moz-progress-bar {
  background: #22c89f;
}
progress.mana::-webkit-progress-value {
  background: #17baff;
}
progress.enemy::-webkit-progress-value {
  background: #e15a49;
}
.dungeon-scores {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: #071a22e8;
  border: 1px solid #7d704e;
  border-radius: 8px;
  padding: 8px;
  font-size: 11px;
  color: #e7d297;
}
.dungeon-scores summary {
  cursor: pointer;
}
.dungeon-scores div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
}
.dungeon-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #0b2029;
  flex-shrink: 0;
}
.dungeon-actions > span {
  flex: 1;
  color: #b5ceca;
  font-size: 12px;
}
.dungeon-actions button {
  border: 1px solid #477a8a;
  border-radius: 7px;
  padding: 9px 14px;
  background: #153744;
  font-size: 12px;
  white-space: nowrap;
}
.dungeon-actions .attack-button {
  background: #b74835;
  border-color: #cf755d;
}
button:disabled {
  opacity: 0.4;
}
.dungeon-results {
  position: absolute;
  inset: 12px;
  z-index: 30;
  background: #081b25f2;
  border-radius: 12px;
  overflow-y: auto;
  padding: 10px;
}
@media (max-width: 650px) {
  .dungeon-heading {
    gap: 8px;
    padding: 8px;
  }
  .dungeon-heading h2 {
    font-size: 15px;
  }
  .dungeon-heading span {
    font-size: 10px;
  }
  .dungeon-actions > span {
    display: none;
  }
  .dungeon-actions {
    justify-content: flex-end;
  }
  .dungeon-vitals > div {
    width: 44%;
    font-size: 10px;
    padding: 6px;
  }
  .dungeon-scores {
    top: 112px;
  }
}
</style>
