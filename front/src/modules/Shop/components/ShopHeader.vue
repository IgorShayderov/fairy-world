<template>
  <div
    class="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
  >
    <div>
      <h2 class="text-lg font-bold text-gray-800">{{ t('shop.title') }}</h2>
      <div v-if="nextRestockAt" class="text-xs text-gray-500">{{ t('shop.newItemsIn') }}: {{ countdown }}</div>
    </div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  gold: number;
  cartTotal: number;
  disabled: boolean;
  nextRestockAt: string | null;
}>();

const emit = defineEmits<{
  (e: 'buy'): void;
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
