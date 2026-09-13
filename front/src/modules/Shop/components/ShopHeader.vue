<template>
  <div
    class="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
  >
    <div class="flex items-center gap-3">
      <div>
        <h2 class="text-lg font-bold text-gray-800">{{ t('shop.title') }}</h2>
        <div v-if="nextRestockAt" class="text-xs text-gray-500">
          {{ t('shop.newItemsIn') }}: {{ countdown }}
        </div>
      </div>
      <button
        class="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="refreshDisabled"
        @click="$emit('refresh')"
      >
        {{ t('shop.refreshItems') }} ({{ refreshCost }} 💎)
      </button>
    </div>
    <span class="flex items-center gap-4 text-lg font-semibold">
      <span class="text-yellow-600">💰 {{ gold }} gold</span>
      <span class="text-violet-600">💎 {{ gems }} {{ t('shop.gems') }}</span>
    </span>
    <div class="flex items-stretch gap-2">
      <button
        class="rounded bg-green-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-600 disabled:opacity-50"
        :disabled="disabled"
        @click="$emit('buy')"
      >
        {{ t('shop.buy') }} ({{ cartTotal }}g)
      </button>
      <button
        class="rounded bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
        :disabled="sellDisabled"
        @click="$emit('sell')"
      >
        {{ t('shop.sell') }} ({{ sellTotal }}g)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  gold: number;
  gems: number;
  cartTotal: number;
  disabled: boolean;
  sellTotal: number;
  sellDisabled: boolean;
  refreshCost: number;
  refreshDisabled: boolean;
  nextRestockAt: string | null;
}>();

const emit = defineEmits<{
  (e: 'buy'): void;
  (e: 'sell'): void;
  (e: 'refresh'): void;
  (e: 'restock-due'): void;
}>();

const { t } = useTranslation();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
let dueEmitted = false;

const remainingSeconds = computed(() => {
  if (!props.nextRestockAt) return 0;
  return Math.max(0, Math.ceil((new Date(props.nextRestockAt).getTime() - now.value) / 1000));
});

const countdown = computed(() => {
  const hours = Math.floor(remainingSeconds.value / 3600);
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60);
  const seconds = remainingSeconds.value % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
});

const tick = () => {
  now.value = Date.now();
  if (props.nextRestockAt && remainingSeconds.value === 0 && !dueEmitted) {
    dueEmitted = true;
    emit('restock-due');
  }
};

watch(
  () => props.nextRestockAt,
  () => {
    dueEmitted = false;
    tick();
  }
);

onMounted(() => {
  tick();
  timer = setInterval(tick, 1000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
