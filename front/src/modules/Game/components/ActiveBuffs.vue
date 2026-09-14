<template>
  <section
    v-if="!compact || active.length"
    :class="compact ? '' : 'rounded-xl border border-gray-200 bg-gray-200 p-5 shadow-sm'"
    :aria-label="t('profile.activeBuffs')"
  >
    <h2 v-if="!compact" class="mb-4 text-sm font-bold text-gray-700">{{ t('profile.activeBuffs') }}</h2>
    <p v-if="!compact && !active.length" class="text-xs text-gray-500">{{ t('profile.noActiveBuffs') }}</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="buff in active"
        :key="buff.type"
        type="button"
        class="rounded-xl border bg-slate-900 shadow-lg transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        :class="[compact ? 'h-9 w-9 p-1' : 'h-16 w-16 p-2', colors[buff.type]]"
        :aria-label="`${t(`profile.buffNames.${buff.type}`)}: ${effect(buff)}. ${remaining(buff.expiresAt)}`"
        @focus="tooltipType = buff.type"
        @blur="tooltipType = null"
      >
        <BuffIcon :type="buff.type" />
        <QTooltip
          :model-value="tooltipType === buff.type"
          class="max-w-xs bg-gray-900 p-3 text-sm text-white"
          @update:model-value="(shown: boolean) => (tooltipType = shown ? buff.type : null)"
        >
          <div class="font-bold">{{ t(`profile.buffNames.${buff.type}`) }}</div>
          <div class="mt-1">{{ effect(buff) }}</div>
          <div class="mt-2 text-amber-200">{{ remaining(buff.expiresAt) }}</div>
        </QTooltip>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QTooltip } from 'quasar';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import type { ActiveBuff } from '@/modules/Auth/api/users';

import BuffIcon from './BuffIcon.vue';

const props = defineProps<{ buffs: ActiveBuff[]; compact?: boolean }>();
const tooltipType = ref<ActiveBuff['type'] | null>(null);
const colors = { DAMAGE: 'border-orange-400/70', DEFENSE: 'border-sky-400/70', EXPERIENCE: 'border-violet-400/70' };
const { t } = useTranslation();
const now = ref(Date.now());
const effect = (buff: ActiveBuff) => t(`profile.buffDescriptions.${buff.type}`, { value: buff.value });
const active = computed(() => props.buffs.filter((buff) => Date.parse(buff.expiresAt) > now.value));
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => clearInterval(timer));
const remaining = (expiresAt: string) => {
  const minutes = Math.max(0, Math.ceil((Date.parse(expiresAt) - now.value) / 60_000));
  return t('profile.buffTimeRemaining', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
};
</script>
