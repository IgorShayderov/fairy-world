<template>
  <main class="realm-page min-h-0 flex-1 overflow-auto p-6 sm:p-8">
    <div class="mx-auto max-w-2xl">
      <h1 class="text-3xl font-bold">{{ t('settings.title') }}</h1>
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <fieldset>
          <legend class="mb-2 text-lg font-semibold">{{ t('settings.language') }}</legend>
          <p class="mb-5 text-sm text-gray-500">{{ t('settings.languageHint') }}</p>
          <div class="flex flex-wrap gap-4">
            <label
              v-for="option in languages"
              :key="option.value"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-3"
            >
              <input
                type="radio"
                name="language"
                :value="option.value"
                :checked="i18next.language === option.value"
                class="accent-amber-400"
                @change="changeLanguage(option.value)"
              />
              <span :lang="option.value">{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
      </section>
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex flex-nowrap items-center justify-between gap-6">
          <div>
            <h2 id="sound-label" class="text-lg font-semibold">{{ t('settings.sounds') }}</h2>
            <p id="sound-hint" class="mt-2 text-sm text-gray-500">{{ t('settings.soundsHint') }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="soundEnabled"
            aria-labelledby="sound-label"
            aria-describedby="sound-hint"
            class="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-[#806f43] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efca72]"
            :class="soundEnabled ? 'bg-[#dfc16d]' : 'bg-[#081a23]'"
            @click="toggleSound"
          >
            <span
              class="h-6 w-6 rounded-full bg-white shadow transition-transform"
              :class="soundEnabled ? 'translate-x-7' : 'translate-x-1'"
            />
          </button>
        </div>
        <p class="mt-3 text-sm text-[#efca72]">{{ t(soundEnabled ? 'settings.soundsOn' : 'settings.soundsOff') }}</p>
        <button
          v-if="soundEnabled"
          type="button"
          class="mt-3 rounded-lg border border-[#806f43] px-4 py-2 text-[#efca72] hover:bg-white/5"
          @click="testSound"
        >
          {{ t('settings.testSound') }}
        </button>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';

import { changeLanguage } from '@/locales/i18n';
import { gameAudio } from '@/shared/audio/gameAudio';

const soundEnabled = gameAudio.enabled;
async function testSound() {
  await gameAudio.unlock();
  gameAudio.play('heal');
}
function toggleSound() {
  gameAudio.setEnabled(!soundEnabled.value);
  if (soundEnabled.value) void testSound();
}

const { t, i18next } = useTranslation();
const languages = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
] as const;
</script>
