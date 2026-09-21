<template>
  <div class="absolute inset-0 z-40 overflow-y-auto bg-[#06141d]/96 p-4 text-slate-100 backdrop-blur-sm sm:p-6">
    <div class="mx-auto max-w-7xl">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-[#806f43]/60 pb-4">
        <div>
          <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">
            {{ t('fantasy.dungeonRun.eyebrow') }}
          </p>
          <h2 class="mt-1 font-serif text-2xl font-semibold text-[#fff0bd] sm:text-3xl">{{ battle.dungeon }}</h2>
          <p class="mt-1 text-sm text-[#a9bfba]">
            {{ t('fantasy.dungeonRun.progress', { defeated: defeatedCount, total: 4 }) }}
          </p>
        </div>
        <div class="min-w-56 rounded-xl border border-[#35515b] bg-[#0d2934] px-4 py-3">
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
      </header>

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
              class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
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
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-[#a9bfba]">
              <span>{{ t('fantasy.dungeonRun.health') }}: {{ opponent.monster.maxHealth }}</span>
              <span>{{ t('fantasy.dungeonRun.damage') }}: {{ opponent.monster.damage }}</span>
              <span>{{ t('fantasy.dungeonRun.defense') }}: {{ formatNumber(opponent.monster.defense) }}%</span>
              <span>{{ t('fantasy.dungeonRun.critical') }}: {{ formatNumber(opponent.monster.criticalChance) }}%</span>
            </div>
            <button
              v-if="battle.status === 'ACTIVE'"
              type="button"
              class="mt-4 w-full rounded-lg bg-[#c5963e] px-4 py-2 text-sm font-bold text-[#081820] transition hover:bg-[#e1bb65] disabled:cursor-not-allowed disabled:opacity-35"
              :disabled="loading || opponent.status !== 'AVAILABLE'"
              @click="$emit('attack', opponent.id)"
            >
              {{ loading ? t('fantasy.encounter.attacking') : t('fantasy.dungeonRun.fight') }}
            </button>
          </div>
        </article>
      </div>

      <div
        v-if="battle.lastExperience > 0"
        class="mt-4 rounded-lg border border-sky-400/25 bg-sky-950/35 px-4 py-3 text-sm text-sky-200"
      >
        {{ t('fantasy.dungeonRun.experienceEarned', { experience: battle.lastExperience }) }}
      </div>

      <section
        v-if="battle.status === 'VICTORY' && battle.rewards"
        class="mt-5 rounded-xl border border-[#d8bd75]/40 bg-[#102d35] p-5"
      >
        <p class="text-xs font-bold tracking-[0.2em] text-[#efca72] uppercase">
          {{ t('fantasy.dungeonRun.completed') }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-5">
          <strong class="text-xl text-[#fff0bd]">+{{ battle.rewards.gold }} {{ t('profile.summary.gold') }}</strong>
          <div class="flex items-center gap-3 rounded-lg border border-[#806f43]/50 bg-[#071923] p-3">
            <img :src="`/icons/items/${battle.rewards.item.icon}`" alt="" class="h-14 w-14 object-contain" />
            <div>
              <div class="font-semibold text-[#fff0bd]">{{ battle.rewards.item.name }}</div>
              <div class="text-xs font-bold uppercase" :class="rarityClass(battle.rewards.item.rarity)">
                {{ battle.rewards.item.rarity }}
              </div>
              <div v-if="battle.rewards.item.inventoryFull" class="mt-1 text-xs text-red-300">
                {{ t('fantasy.encounter.inventoryFullLootNotice') }}
              </div>
            </div>
          </div>
          <button
            class="ml-auto rounded-lg border border-[#d8bd75]/50 px-4 py-2 text-sm text-[#fff0bd] hover:bg-white/5"
            @click="$emit('close')"
          >
            {{ t('fantasy.encounter.returnToMap') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';

import type { DungeonOpponentStatus, DungeonRunState } from '@/modules/Monsters/api';

const props = defineProps<{ battle: DungeonRunState; playerName: string; loading: boolean }>();
defineEmits<{ (event: 'attack', opponentId: string): void; (event: 'close'): void }>();

const { t } = useTranslation();
const defeatedCount = computed(() => props.battle.opponents.filter(({ status }) => status === 'DEFEATED').length);
const playerHealthPercent = computed(() =>
  Math.max(0, Math.min(100, (props.battle.player.health / props.battle.player.maxHealth) * 100))
);
const formatNumber = (value: number) => Math.round(value * 10) / 10;
const cardClass = (status: DungeonOpponentStatus, isBoss: boolean) => ({
  'border-amber-300/45': isBoss && status !== 'DEFEATED',
  'border-[#35515b]': !isBoss && status !== 'DEFEATED',
  'border-emerald-500/35 opacity-75': status === 'DEFEATED',
});
const rarityClass = (rarity: string) => (rarity === 'UNIQUE' ? 'text-orange-300' : 'text-violet-300');
</script>
