<template>
  <main class="realm-page min-h-0 flex-1 overflow-auto p-6 sm:p-8">
    <div class="mx-auto max-w-2xl">
      <h1 class="text-3xl font-bold">{{ t('settings.title') }}</h1>
      <section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <fieldset>
          <legend class="mb-2 text-lg font-semibold">{{ t('settings.language') }}</legend>
          <p class="mb-5 text-sm text-gray-500">{{ t('settings.languageHint') }}</p>
          <div class="flex flex-wrap gap-4">
            <label v-for="option in languages" :key="option.value" class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-4 py-3">
              <input type="radio" name="language" :value="option.value" :checked="i18next.language === option.value" class="accent-amber-400" @change="changeLanguage(option.value)" />
              <span :lang="option.value">{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';

import { changeLanguage } from '@/locales/i18n';

const { t, i18next } = useTranslation();
const languages = [{ value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }] as const;
</script>
