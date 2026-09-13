<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-[#06141d]/85 p-5 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" :aria-label="landmark.name" class="w-full max-w-lg rounded-2xl border bg-[#102831] p-7 text-[#d6e1de] shadow-2xl" :style="{ borderColor: landmark.accent }">
      <div class="mb-3 text-xs tracking-widest uppercase" :style="{ color: landmark.accent }">{{ t(`fantasy.landmark.${kind}.label`) }}</div>
      <h2 class="font-serif text-3xl text-[#fff0bd]">{{ landmark.name }}</h2>
      <p class="mt-2 text-sm italic">{{ landmark.subtitle }}</p>
      <p class="mt-5 leading-relaxed">{{ t(`fantasy.landmark.${kind}.story`) }}</p>
      <p class="mt-3 text-sm text-[#efca72]">{{ t(`fantasy.landmark.${kind}.effect`) }}</p>
      <p v-if="message" role="status" class="mt-4 rounded-lg bg-white/10 p-3 text-sm">{{ message }}</p>
      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <button class="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50" :disabled="pending" @click="$emit('close')">{{ t('fantasy.landmark.leave') }}</button>
        <button v-if="kind === 'village'" class="rounded-lg border border-white/20 px-4 py-2" @click="$emit('rumors')">{{ t('fantasy.landmark.rumors') }}</button>
        <button class="rounded-lg bg-[#dfc16d] px-4 py-2 font-semibold text-[#102831] disabled:opacity-50" :disabled="pending" @click="$emit('action')">{{ pending ? t('shop.loading') : t(`fantasy.landmark.${kind}.action`) }}</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';

import type { Landmark } from '@/modules/Game/composables/useMapObjects';

const props = defineProps<{ landmark: Landmark; pending: boolean; message: string }>();
defineEmits<{ (event: 'close'): void; (event: 'action'): void; (event: 'rumors'): void }>();
const { t } = useTranslation();
const kind = computed(() => props.landmark.type === 'dungeon' || props.landmark.type === 'sanctum' ? props.landmark.type : 'village');
</script>
