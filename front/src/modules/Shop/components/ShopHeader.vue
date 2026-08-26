<template>
  <div
    class="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
  >
    <h2 class="text-lg font-bold text-gray-800">{{ t('shop.title') }}</h2>
    <span class="text-lg font-semibold text-yellow-600">💰 {{ gold }} gold</span>
    <button
      class="rounded bg-green-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-600 disabled:opacity-50"
      :disabled="disabled"
      @click="$emit('buy')"
    >
      {{ t('shop.buy') }} ({{ cartTotal }}g)
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

defineProps<{
  gold: number;
  cartTotal: number;
  disabled: boolean;
}>();

defineEmits<{
  (e: 'buy'): void;
}>();

const { t } = useTranslation();
</script>
