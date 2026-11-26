<template>
  <div class="shop-toolbar">
    <div class="shop-restock">
      <div>
        <h2 class="shop-heading">{{ t('shop.title') }}</h2>
        <div v-if="nextRestockAt" class="shop-countdown">{{ t('shop.newItemsIn') }}: {{ countdown }}</div>
      </div>
      <button class="shop-button shop-button--restock" :disabled="refreshDisabled" @click="$emit('refresh')">
        {{ t('shop.refreshItems') }} ({{ refreshCost }} 💎)
      </button>
    </div>
    <span class="shop-wallet">
      <span class="wallet-gold">💰 {{ gold }} gold</span>
      <span class="wallet-gems">💎 {{ gems }} {{ t('shop.gems') }}</span>
    </span>
    <button
      class="shop-button shop-button--trade"
      :class="{ 'shop-button--selling': isSelling }"
      :disabled="isSelling ? sellDisabled : disabled"
      @click="submitTrade"
    >
      {{ t(isSelling ? 'shop.sell' : 'shop.buy') }} ({{ isSelling ? sellTotal : cartTotal }}g)
    </button>
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
const isSelling = computed(() => props.sellTotal > 0);
const submitTrade = () => {
  if (isSelling.value) emit('sell');
  else emit('buy');
};
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

<style scoped>
.shop-toolbar {
  position: relative;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  padding: 12px 24px 16px;
  background: #102b34;
  color: #d8e6e3;
  border-bottom: 1px solid #bca26955;
}
.shop-restock,
.shop-wallet {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.shop-heading {
  margin: 0;
  color: #f2d897;
  font:
    600 18px/1.4 Georgia,
    serif;
}
.shop-countdown {
  font-size: 12px;
  color: #a9c3c5;
  font-variant-numeric: tabular-nums;
}
.shop-wallet {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.wallet-gold {
  color: #f2d897;
}
.wallet-gems {
  color: #b6d7ed;
}
.shop-button {
  border: 1px solid #bca26999;
  border-radius: 8px;
  padding: 9px 14px;
  background: #1c4148;
  color: #f2d897;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.shop-button:hover:not(:disabled) {
  background: #2a5358;
  border-color: #f2d897;
}
.shop-button:focus-visible {
  outline: 2px solid #f2d897;
  outline-offset: 3px;
}
.shop-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.shop-button--trade {
  background: #e1c477;
  color: #102b34;
  padding-inline: 24px;
  font-size: 14px;
}
.shop-button--trade:hover:not(:disabled) {
  background: #f2d897;
}
.shop-button--selling {
  background: #244c48;
  color: #b5e3d4;
  border-color: #77b9a4;
}
.shop-button--selling:hover:not(:disabled) {
  background: #326059;
  border-color: #b5e3d4;
}
@media (max-width: 760px) {
  .shop-toolbar {
    padding: 12px 16px 16px;
    gap: 12px;
  }
  .shop-restock {
    width: 100%;
    justify-content: space-between;
  }
  .shop-wallet {
    font-size: 14px;
    gap: 8px;
  }
}
</style>
