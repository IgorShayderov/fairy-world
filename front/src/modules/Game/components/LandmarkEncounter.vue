<template>
  <div
    class="absolute inset-0 z-40 flex items-center justify-center bg-[#06141d]/85 p-5 backdrop-blur-sm"
    @click.self="continueJourney"
  >
    <section
      role="dialog"
      aria-modal="true"
      :aria-label="landmark.name"
      class="w-full max-w-lg rounded-2xl border bg-[#102831] p-7 text-[#d6e1de] shadow-2xl"
      :style="{ borderColor: landmark.accent }"
    >
      <div class="mb-3 text-xs tracking-widest uppercase" :style="{ color: landmark.accent }">
        {{ t(`fantasy.landmark.${kind}.label`) }}
      </div>
      <h2 class="font-serif text-3xl text-[#fff0bd]">{{ landmark.name }}</h2>
      <p class="mt-2 text-sm italic">{{ landmark.subtitle }}</p>
      <p class="mt-5 leading-relaxed">{{ t(`fantasy.landmark.${kind}.story`) }}</p>
      <p class="mt-3 text-sm text-[#efca72]">
        {{ t(kind === 'sanctum' ? `fantasy.landmark.blessings.${landmark.name}` : `fantasy.landmark.${kind}.effect`) }}
      </p>
      <p v-if="message" role="status" class="mt-4 rounded-lg bg-white/10 p-3 text-sm">{{ message }}</p>
      <p v-if="coolingDown" class="mt-3 text-sm text-amber-200">
        {{
          t(kind === 'sanctum' ? 'fantasy.landmark.blessingCooldown' : 'fantasy.landmark.cooldown', {
            minutes: Math.ceil((Date.parse(nextEntryAt!) - now) / 60000),
          })
        }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <button
          v-if="coolingDown && kind === 'dungeon'"
          class="rounded-lg border border-violet-300 px-4 py-2 text-violet-200 disabled:opacity-50"
          :disabled="pending || gems < 10"
          @click="$emit('reset-dungeon')"
        >
          {{ t('fantasy.landmark.resetDungeon') }}
        </button>
        <button
          class="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50"
          :disabled="pending"
          @click="$emit('close')"
        >
          {{ t('fantasy.landmark.leave') }}
        </button>
        <button
          v-if="kind === 'village'"
          class="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50"
          :disabled="pending"
          @click="$emit('quests')"
        >
          {{ t('menu.quests') }}
        </button>
        <button
          v-if="kind === 'dungeon'"
          class="rounded-lg border border-[#d8bd75]/55 px-4 py-2 font-semibold text-[#fff0bd] disabled:opacity-50"
          :disabled="pending || coolingDown"
          @click="$emit('party')"
        >
          {{ t('fantasy.party.commandDungeon') }}
        </button>
        <button
          class="rounded-lg bg-[#dfc16d] px-4 py-2 font-semibold text-[#102831] disabled:opacity-50"
          :disabled="pending || coolingDown"
          @click="requestAction"
        >
          {{ pending ? t('shop.loading') : t(`fantasy.landmark.${kind}.action`) }}
        </button>
      </div>
    </section>

    <div
      v-if="showDungeonWarning"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      :aria-label="t('fantasy.landmark.dungeon.healthWarningTitle')"
      @click.self="showDungeonWarning = false"
    >
      <section class="w-full max-w-md rounded-2xl border border-amber-300/45 bg-[#102831] p-6 shadow-2xl">
        <h3 class="font-serif text-2xl text-[#fff0bd]">{{ t('fantasy.landmark.dungeon.healthWarningTitle') }}</h3>
        <p class="mt-3 text-sm leading-6 text-[#d6e1de]">{{ t('fantasy.landmark.dungeon.healthWarning') }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-white/20 px-4 py-2" @click="showDungeonWarning = false">
            {{ t('fantasy.landmark.dungeon.cancelEntry') }}
          </button>
          <button class="rounded-lg bg-[#dfc16d] px-4 py-2 font-semibold text-[#102831]" @click="confirmDungeonEntry">
            {{ t('fantasy.landmark.dungeon.confirmEntry') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, ref, onMounted, onUnmounted } from 'vue';

import type { Landmark } from '@/modules/Game/composables/useMapObjects';

const props = defineProps<{
  landmark: Landmark;
  pending: boolean;
  message: string;
  gems: number;
  nextEntryAt?: string | undefined;
}>();
const now = ref(Date.now());
const coolingDown = computed(() => !!props.nextEntryAt && Date.parse(props.nextEntryAt) > now.value);
const showDungeonWarning = ref(false);
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => clearInterval(timer));
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'action'): void;
  (event: 'quests'): void;
  (event: 'party'): void;
  (event: 'reset-dungeon'): void;
}>();
const { t } = useTranslation();
const kind = computed(() =>
  props.landmark.type === 'dungeon' || props.landmark.type === 'sanctum' ? props.landmark.type : 'village'
);
const requestAction = () => {
  if (kind.value === 'dungeon') showDungeonWarning.value = true;
  else emit('action');
};
const confirmDungeonEntry = () => {
  showDungeonWarning.value = false;
  emit('action');
};
const continueJourney = () => {
  if (!props.pending && !showDungeonWarning.value) emit('close');
};
</script>
