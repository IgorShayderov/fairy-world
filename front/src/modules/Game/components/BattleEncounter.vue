<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-[#06141d]/85 p-5 backdrop-blur-sm">
    <section class="encounter-panel w-full max-w-4xl overflow-hidden rounded-2xl border border-[#ddbd6b]/45 text-white shadow-2xl">
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
        <div v-if="battle.events.length" class="mt-2 space-y-1 text-sm text-[#d6e1de]">
          <div v-for="(event, index) in battle.events" :key="index">
            {{ eventText(event) }}
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-[#92aaa5]">{{ t('fantasy.encounter.chooseAction') }}</p>
        <div v-if="battle.rewards" class="mt-3 flex gap-4 font-bold text-[#efca72]">
          <span>+{{ battle.rewards.gold }} {{ t('profile.summary.gold') }}</span>
          <span>+{{ battle.rewards.experience }} {{ t('profile.summary.experience') }}</span>
        </div>
      </div>

      <footer class="flex justify-end gap-3 border-t border-[#ddbd6b]/15 bg-[#081a23] px-6 py-4">
        <button
          v-if="battle.status === 'ACTIVE'"
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
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QIcon } from 'quasar';
import { computed, defineComponent, h } from 'vue';

import type { BattleState } from '@/modules/Monsters/api';

const props = defineProps<{ battle: BattleState; playerName: string; loading: boolean }>();
defineEmits<{ (event: 'attack'): void; (event: 'retreat'): void; (event: 'close'): void }>();
const { t } = useTranslation();

const statusTitle = computed(() => {
  if (props.battle.status === 'VICTORY') return t('fantasy.encounter.victory');
  if (props.battle.status === 'DEFEAT') return t('fantasy.encounter.defeat');
  return t('fantasy.encounter.title');
});

const eventText = (event: BattleState['events'][number]) => {
  const actor = t(`fantasy.encounter.${event.actor === 'PLAYER' ? 'you' : 'enemy'}`);
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
            class: card.color === 'player' ? 'h-full bg-emerald-400 transition-all' : 'h-full bg-red-400 transition-all',
            style: { width: `${Math.max(0, (card.health / card.maxHealth) * 100)}%` },
          }),
        ]),
        h('div', { class: 'mt-1 text-xs text-white/75' }, `${card.health} / ${card.maxHealth} HP · ${card.damage} DMG`),
      ]);
  },
});
</script>

<style scoped>
.encounter-panel { background: linear-gradient(145deg, rgb(14 38 47 / 98%), rgb(20 28 36 / 98%)); }
.battlefield-grid {
  background: radial-gradient(circle at 25% 50%, rgb(67 167 147 / 16%), transparent 30%),
    radial-gradient(circle at 75% 50%, rgb(198 77 59 / 18%), transparent 30%), #102831;
}
.combatant { display: flex; width: 92px; height: 92px; align-items: center; justify-content: center; border-radius: 50%; }
.combatant-player { color: #9ce2d2; border: 2px solid rgb(127 218 197 / 60%); background: #173f40; }
.combatant-monster { color: #ffab95; border: 2px solid rgb(238 111 83 / 60%); background: #42242a; }
</style>
