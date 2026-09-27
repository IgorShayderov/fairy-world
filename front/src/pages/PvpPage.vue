<template>
  <main class="realm-page min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
    <div class="mx-auto max-w-6xl">
      <!-- Arena Header -->
      <header class="arena-header relative overflow-hidden rounded-2xl border border-[#d8bd75]/30 p-6 shadow-xl sm:p-7">
        <div class="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <div
              class="arena-emblem flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#efca72]/45 text-[#ffe59a]"
            >
              <QIcon name="shield" size="34px" />
            </div>
            <div>
              <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">
                {{ t('pvp.eyebrow') }}
              </p>
              <h1 class="mt-1 font-serif text-3xl font-semibold text-[#fff0bd]">
                {{ t('pvp.title') }}
              </h1>
              <p class="mt-1 text-sm text-[#a9bfba]">
                {{ t('pvp.subtitle') }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Player Level -->
            <div class="rounded-xl border border-[#d8bd75]/20 bg-[#071a23] px-4 py-2 text-right">
              <div class="text-[10px] font-bold tracking-wider text-[#efca72] uppercase">
                {{ currentUserStore.user?.name ?? t('pvp.player') }}
              </div>
              <div class="text-sm font-semibold text-white">
                {{ t('profile.summary.level') }} {{ currentUserStore.user?.level ?? 1 }}
              </div>
            </div>

            <!-- Coins of Honour Balance -->
            <div class="rounded-xl border border-[#d8bd75]/20 bg-[#071a23] px-4 py-2 text-right">
              <div class="text-[10px] font-bold tracking-wider text-[#efca72] uppercase">
                {{ t('pvp.coinsOfHonour') }}
              </div>
              <div class="flex items-center justify-end gap-1.5 text-sm font-bold text-amber-300">
                <QIcon name="military_tech" size="18px" />
                <span>{{ currentUserStore.user?.coinsOfHonour ?? 0 }}</span>
              </div>
            </div>

            <!-- Refresh Button (Costs 30 Gems) -->
            <button
              type="button"
              class="flex h-11 min-w-[220px] items-center justify-center gap-2 rounded-xl border border-[#d8bd75]/40 bg-[#0d2934] px-4 text-xs font-bold tracking-wider text-[#f0d68a] uppercase shadow-md transition hover:border-[#f0d68a] hover:bg-[#133744] disabled:opacity-50"
              :disabled="loading || dueling || (currentUserStore.user?.gems ?? 0) < 30"
              @click="handleRefresh"
            >
              <QIcon name="refresh" size="18px" :class="{ 'animate-spin': loading }" />
              <span>{{ loading ? t('pvp.refreshing') : t('pvp.refreshWithCost', { cost: 30 }) }}</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        v-if="!activeDuel"
        class="mt-6 inline-flex rounded-xl border border-[#d8bd75]/25 bg-[#071a23] p-1 shadow-lg"
        :aria-label="t('pvp.sectionNavigation')"
      >
        <button
          v-for="tab in pvpTabs"
          :key="tab.id"
          type="button"
          class="flex h-10 items-center gap-2 rounded-lg px-5 text-xs font-bold tracking-wider uppercase transition"
          :class="
            activeTab === tab.id
              ? 'bg-[#d6b75f] text-[#08202a] shadow'
              : 'text-[#a9bfba] hover:bg-[#12313c] hover:text-[#fff0bd]'
          "
          @click="activeTab = tab.id"
        >
          <QIcon :name="tab.icon" size="18px" />
          {{ t(tab.labelKey) }}
        </button>
      </nav>

      <!-- Opponents Grid -->
      <section v-if="!activeDuel && activeTab === 'arena'" class="mt-8">
        <!-- Attack Cooldown Notice -->
        <div
          v-if="cooldownSeconds > 0"
          class="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3 text-sm font-semibold text-amber-200">
            <QIcon name="timer" size="22px" class="text-amber-400" />
            <span>{{ t('pvp.cooldownRemaining', { time: formattedCooldown }) }}</span>
          </div>

          <button
            type="button"
            class="flex h-9 items-center justify-center gap-2 rounded-xl border border-[#d8bd75]/30 bg-[#bd4938] px-4 text-xs font-bold tracking-wider text-white uppercase shadow transition hover:bg-[#d15743] disabled:opacity-50"
            :disabled="resettingCooldown || (currentUserStore.user?.gems ?? 0) < 10"
            @click="handleResetCooldown"
          >
            <QIcon name="flash_on" size="16px" />
            <span>{{ t('pvp.resetCooldown', { cost: 10 }) }}</span>
          </button>
        </div>

        <h2 class="mb-4 font-serif text-xl font-semibold text-[#fff0bd]">
          {{ t('pvp.opponentsTitle') }}
        </h2>

        <div
          v-if="error"
          role="alert"
          class="rounded-xl border border-red-500/30 bg-red-950/60 p-5 text-sm text-red-200"
        >
          {{ error }}
        </div>

        <div v-else-if="loading && !opponents.length" class="flex justify-center py-16">
          <div class="flex items-center gap-3 text-amber-200">
            <QIcon name="hourglass_empty" size="28px" class="animate-spin" />
            <span class="text-sm font-medium tracking-wide uppercase">{{ t('pvp.refreshing') }}</span>
          </div>
        </div>

        <div
          v-else-if="!opponents.length"
          class="rounded-xl border border-white/10 bg-[#0b2530] p-8 text-center text-sm text-[#a9bfba]"
        >
          {{ t('pvp.noOpponents') }}
        </div>

        <div v-else class="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          <article
            v-for="opp in opponents"
            :key="opp.id"
            class="opponent-card flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-[#0b2530] shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
            :class="`opponent-card--${opp.difficulty.toLowerCase()}`"
          >
            <!-- Card Difficulty Banner -->
            <div
              class="flex h-10 items-center justify-between border-b border-[#d8bd75]/20 bg-[#071a23]/90 px-4 text-xs font-bold tracking-wider text-[#efca72] uppercase"
            >
              <span>{{ difficultyLabel(opp.difficulty) }}</span>
              <span
                class="rounded border border-[#d8bd75]/25 bg-[#0b2530] px-2 py-0.5 text-[10px] font-semibold text-[#a9bfba] normal-case"
              >
                {{ t('profile.summary.level') }} {{ opp.level }}
              </span>
            </div>

            <!-- Opponent Portrait & Name -->
            <div class="flex h-24 items-center gap-4 p-5 pb-3">
              <div
                class="opponent-emblem flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#d8bd75]/35 bg-[#071a23] text-[#efca72] shadow-inner"
              >
                <QIcon :name="difficultyIcon(opp.difficulty)" size="28px" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-serif text-base font-bold text-white" :title="opp.name">
                  {{ opp.name }}
                </h3>
                <div class="text-xs font-semibold text-[#efca72]">{{ t('profile.summary.level') }} {{ opp.level }}</div>
              </div>
            </div>

            <!-- Combat Stats Breakdown -->
            <div class="mx-5 my-2 rounded-xl border border-[#d8bd75]/15 bg-[#071a23] p-3 text-xs">
              <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[#a9bfba]">
                <div class="flex items-center justify-between gap-2">
                  <span class="flex items-center gap-1.5"><QIcon name="favorite" size="14px" />{{ t('pvp.hp') }}</span>
                  <span class="font-bold text-white">{{ opp.health }}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="flex items-center gap-1.5"><QIcon name="bolt" size="14px" />{{ t('pvp.damage') }}</span>
                  <span class="font-bold text-amber-300">{{ opp.damage }}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="flex items-center gap-1.5"
                    ><QIcon name="shield" size="14px" />{{ t('pvp.defense') }}</span
                  >
                  <span class="font-bold text-sky-300">{{ opp.defense }}%</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="flex items-center gap-1.5"><QIcon name="air" size="14px" />{{ t('pvp.dodge') }}</span>
                  <span class="font-bold text-emerald-300">{{ opp.dodge }}%</span>
                </div>
              </div>
            </div>

            <!-- Keep exact experience hidden until the duel is resolved. -->
            <div class="mt-auto flex min-h-[58px] items-center gap-2 px-5 py-3 text-xs leading-5 text-[#a9bfba]">
              <QIcon name="military_tech" size="18px" class="shrink-0 text-[#efca72]" />
              <span>{{ t('pvp.victoryRewardHint') }}</span>
            </div>

            <!-- Attack Action Button -->
            <div class="border-t border-[#d8bd75]/15 p-4 pt-3">
              <button
                type="button"
                class="flex h-11 w-full items-center justify-center rounded-xl bg-[#bd4938] text-xs font-bold tracking-widest text-white uppercase shadow-lg transition hover:bg-[#d15743] hover:brightness-110 disabled:opacity-50"
                :disabled="dueling || cooldownSeconds > 0"
                @click="handleDuel(opp.id)"
              >
                <span v-if="dueling && selectedOpponentId === opp.id" class="flex items-center gap-2">
                  <QIcon name="hourglass_empty" size="16px" class="animate-spin" />
                  <span>{{ t('pvp.dueling') }}</span>
                </span>
                <span v-else-if="cooldownSeconds > 0" class="flex items-center gap-1.5">
                  <QIcon name="timer" size="16px" />
                  <span>{{ t('pvp.duel') }} ({{ formattedCooldown }})</span>
                </span>
                <span v-else class="flex items-center gap-2"><QIcon name="bolt" size="17px" />{{ t('pvp.duel') }}</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <PvpShop v-if="!activeDuel && activeTab === 'shop'" />

      <!-- Active Duel Combat Modal -->
      <section
        v-if="activeDuel"
        class="mt-6 overflow-hidden rounded-2xl border border-[#ddbd6b]/45 bg-[linear-gradient(145deg,rgb(14_38_47/98%),rgb(20_28_36/98%))] text-white shadow-2xl"
      >
        <header class="border-b border-[#ddbd6b]/20 px-6 py-4 text-center">
          <div class="text-[10px] font-bold tracking-[0.34em] text-[#efca72] uppercase">
            {{ t('pvp.title') }} · Turn {{ activeDuel.turn }}
          </div>
          <h2
            class="mt-1 font-serif text-3xl font-semibold"
            :class="activeDuel.status === 'VICTORY' ? 'text-amber-300' : 'text-rose-400'"
          >
            {{ activeDuel.status === 'VICTORY' ? t('pvp.victory') : t('pvp.defeat') }}
          </h2>
        </header>

        <!-- Combatant VS Stage -->
        <div class="relative grid grid-cols-[1fr_auto_1fr] items-center gap-7 bg-[#102831] px-8 py-7">
          <!-- Player Card -->
          <div class="flex flex-col items-center">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-[#173f40] text-emerald-300 shadow-md"
            >
              <QIcon name="auto_awesome" size="40px" />
            </div>
            <div class="mt-3 text-sm font-bold tracking-wide">{{ activeDuel.player.name }}</div>
            <div class="mt-1 text-xs text-[#a9bfba]">Lvl {{ activeDuel.player.level }}</div>
            <div class="mt-2 h-3 w-full max-w-48 overflow-hidden rounded-full bg-black/40">
              <div
                class="h-full bg-emerald-400 transition-all duration-300"
                :style="{ width: `${Math.max(0, (activeDuel.player.health / activeDuel.player.maxHealth) * 100)}%` }"
              />
            </div>
            <div class="mt-1 text-xs text-white/80">
              {{ activeDuel.player.health }} / {{ activeDuel.player.maxHealth }} HP · {{ activeDuel.player.damage }} DMG
            </div>
          </div>

          <div
            class="versus-mark flex h-14 w-14 items-center justify-center rounded-full border border-[#e8c66f]/40 font-serif text-lg font-black text-[#ffe59a]"
          >
            {{ t('pvp.vs') }}
          </div>

          <!-- Opponent Card -->
          <div class="flex flex-col items-center">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-400/60 bg-[#42242a] text-rose-300 shadow-md"
            >
              <QIcon name="military_tech" size="40px" />
            </div>
            <div class="mt-3 text-sm font-bold tracking-wide">{{ activeDuel.opponent.name }}</div>
            <div class="mt-1 text-xs text-[#a9bfba]">Lvl {{ activeDuel.opponent.level }}</div>
            <div class="mt-2 h-3 w-full max-w-48 overflow-hidden rounded-full bg-black/40">
              <div
                class="h-full bg-rose-400 transition-all duration-300"
                :style="{
                  width: `${Math.max(0, (activeDuel.opponent.health / activeDuel.opponent.maxHealth) * 100)}%`,
                }"
              />
            </div>
            <div class="mt-1 text-xs text-white/80">
              {{ activeDuel.opponent.health }} / {{ activeDuel.opponent.maxHealth }} HP ·
              {{ activeDuel.opponent.damage }} DMG
            </div>
          </div>
        </div>

        <!-- Combat Events Log -->
        <div class="border-t border-[#ddbd6b]/15 bg-[#0b2029]/85 px-6 py-5">
          <h3 class="text-xs font-bold tracking-[0.16em] text-[#efca72] uppercase">
            {{ t('pvp.combatLog') }}
          </h3>
          <div class="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm text-[#d6e1de]">
            <div
              v-for="(event, idx) in activeDuel.events"
              :key="idx"
              class="flex items-center gap-2"
              :class="event.actor === 'PLAYER' ? 'text-emerald-300' : 'text-rose-300'"
            >
              <span>•</span>
              <span>{{ formatCombatEvent(event) }}</span>
            </div>
          </div>

          <!-- Victory Rewards (Experience and Coin of Honour) -->
          <div v-if="activeDuel.rewards" class="mt-4 rounded-xl border border-amber-400/30 bg-[#071a23] p-4">
            <div class="text-xs font-bold tracking-wider text-[#efca72] uppercase">
              {{ t('pvp.rewards') }}
            </div>
            <div class="mt-2 flex gap-6 text-sm font-bold">
              <span class="text-emerald-300">+{{ activeDuel.rewards.experience }} {{ t('pvp.experience') }}</span>
              <span class="text-amber-300"
                >+{{ activeDuel.rewards.coinsOfHonour ?? 1 }} {{ t('pvp.coinOfHonour') }}</span
              >
            </div>
          </div>
        </div>

        <!-- Duel Footer -->
        <footer class="flex justify-end border-t border-[#ddbd6b]/15 bg-[#081a23] px-6 py-4">
          <button
            type="button"
            class="rounded-xl border border-[#dfc16d]/45 bg-[#dfc16d]/15 px-7 py-2.5 text-xs font-bold tracking-widest text-[#ffe69a] uppercase shadow-lg transition hover:bg-[#dfc16d]/25"
            @click="closeDuel"
          >
            {{ t('pvp.returnToArena') }}
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { Notify, QIcon } from 'quasar';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import {
  pvpApi,
  type PvpBattleEvent,
  type PvpDifficulty,
  type PvpDuelResult,
  type PvpOpponent,
} from '@/modules/Pvp/api';
import { getApiErrorMessage } from '@/shared/api/error-message';

import PvpShop from '@/modules/Pvp/components/PvpShop.vue';

const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();

const opponents = ref<PvpOpponent[]>([]);
const loading = ref(false);
const dueling = ref(false);
const resettingCooldown = ref(false);
const error = ref<string | null>(null);
const selectedOpponentId = ref<string | null>(null);
const activeDuel = ref<PvpDuelResult | null>(null);
const activeTab = ref<'arena' | 'shop'>('arena');
const pvpTabs = [
  { id: 'arena' as const, labelKey: 'pvp.arenaTab', icon: 'shield' },
  { id: 'shop' as const, labelKey: 'pvp.shopTab', icon: 'workspace_premium' },
];

const now = ref(Date.now());
let timerInterval: NodeJS.Timeout | null = null;

const cooldownSeconds = computed(() => {
  const until = currentUserStore.user?.pvpCooldownUntil;
  if (!until) return 0;
  const diff = Math.ceil((new Date(until).getTime() - now.value) / 1000);
  return diff > 0 ? diff : 0;
});

const formattedCooldown = computed(() => {
  const total = cooldownSeconds.value;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
});

const fetchOpponents = async () => {
  loading.value = true;
  error.value = null;
  try {
    opponents.value = await pvpApi.getOpponents();
  } catch (err: unknown) {
    error.value = getApiErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

const handleRefresh = async () => {
  loading.value = true;
  error.value = null;
  try {
    opponents.value = await pvpApi.refreshOpponents();
    await currentUserStore.fetchCurrentUser(true);
    Notify.create({ type: 'info', message: t('pvp.opponentsTitle') });
  } catch (err: unknown) {
    error.value = getApiErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

const handleResetCooldown = async () => {
  resettingCooldown.value = true;
  try {
    await pvpApi.resetCooldown();
    await currentUserStore.fetchCurrentUser(true);
    Notify.create({ type: 'positive', message: t('pvp.cooldownReady') });
  } catch (err: unknown) {
    Notify.create({ type: 'negative', message: getApiErrorMessage(err) });
  } finally {
    resettingCooldown.value = false;
  }
};

const handleDuel = async (opponentId: string) => {
  if (cooldownSeconds.value > 0) {
    Notify.create({ type: 'warning', message: t('pvp.cooldownRemaining', { time: formattedCooldown.value }) });
    return;
  }

  dueling.value = true;
  selectedOpponentId.value = opponentId;
  try {
    const result = await pvpApi.duel(opponentId);
    activeDuel.value = result;
    await currentUserStore.fetchCurrentUser(true);
    if (result.status === 'VICTORY') {
      Notify.create({ type: 'positive', message: t('pvp.victory') });
    } else {
      Notify.create({ type: 'negative', message: t('pvp.defeat') });
    }
  } catch (err: unknown) {
    Notify.create({ type: 'negative', message: getApiErrorMessage(err) });
  } finally {
    dueling.value = false;
    selectedOpponentId.value = null;
  }
};

const closeDuel = async () => {
  activeDuel.value = null;
  await fetchOpponents();
};

const formatCombatEvent = (event: PvpBattleEvent) => {
  const actor =
    event.blocked || event.dodged
      ? event.actor === 'PLAYER'
        ? t('pvp.opponent')
        : t('pvp.player')
      : event.actor === 'PLAYER'
        ? t('pvp.player')
        : t('pvp.opponent');
  if (event.dodged) return t('pvp.dodged', { actor });
  if (event.blocked) return t('pvp.blocked', { actor });
  if (event.critical) return t('pvp.criticalHit', { actor, damage: event.damage });
  return t('pvp.hit', { actor, damage: event.damage });
};

const difficultyLabel = (difficulty: PvpDifficulty) => {
  if (difficulty === 'EASY') return t('pvp.easy');
  if (difficulty === 'MEDIUM') return t('pvp.medium');
  return t('pvp.hard');
};

const difficultyIcon = (difficulty: PvpDifficulty) => {
  if (difficulty === 'EASY') return 'person';
  if (difficulty === 'MEDIUM') return 'shield';
  return 'military_tech';
};

onMounted(() => {
  void fetchOpponents();
  timerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.arena-header {
  background:
    radial-gradient(circle at 7% 20%, rgb(225 193 105 / 16%) 0 1px, transparent 2px),
    radial-gradient(circle at 88% -30%, rgb(225 193 105 / 14%) 0 20%, transparent 45%),
    linear-gradient(130deg, #0d2b35 0%, #0b2530 55%, #101d28 100%);
}

.arena-header::after {
  position: absolute;
  right: -72px;
  bottom: -120px;
  width: 270px;
  height: 270px;
  content: '';
  border: 1px solid rgb(239 202 114 / 12%);
  border-radius: 9999px;
  box-shadow:
    0 0 0 28px rgb(239 202 114 / 4%),
    0 0 0 58px rgb(239 202 114 / 3%);
}

.arena-emblem,
.versus-mark {
  background: radial-gradient(circle at 35% 30%, #244b53 0%, #102933 62%, #071a23 100%);
  box-shadow:
    inset 0 0 18px rgb(239 202 114 / 8%),
    0 8px 24px rgb(0 0 0 / 28%);
}

.opponent-card {
  border-color: rgb(216 189 117 / 28%);
}

.opponent-card--easy:hover {
  border-color: rgb(110 231 183 / 65%);
}

.opponent-card--medium:hover {
  border-color: rgb(125 211 252 / 65%);
}

.opponent-card--hard:hover {
  border-color: rgb(251 191 36 / 72%);
}

.opponent-emblem {
  box-shadow:
    inset 0 0 15px rgb(239 202 114 / 9%),
    0 5px 16px rgb(0 0 0 / 25%);
}

@media (max-width: 640px) {
  .arena-emblem {
    width: 3rem;
    height: 3rem;
  }
}
</style>
