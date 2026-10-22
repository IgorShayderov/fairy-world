<template>
  <section class="feedback-stack" aria-label="Gem prices">
    <div class="feedback-actions justify-between">
      <p class="feedback-muted">
        Set gem prices for premium accounts, skipping timers, and refreshing timed content. Changes apply to all
        players.
      </p>
      <button class="feedback-button" :disabled="busy" @click="load">Reload prices</button>
    </div>
    <p class="feedback-muted">Use a whole number from 0 to 100,000. A price of 0 makes the action free.</p>
    <p v-if="error" class="feedback-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="feedback-success" role="status">{{ notice }}</p>
    <p v-if="busy && !prices.length" role="status">Loading prices…</p>
    <div class="gem-price-grid">
      <form v-for="price in prices" :key="price.key" class="feedback-card feedback-stack" @submit.prevent="save(price)">
        <h2>{{ price.label }}</h2>
        <p class="feedback-muted">Current: {{ price.cost }} gems · Default: {{ price.defaultCost }} gems</p>
        <div class="gem-price-controls">
          <label :for="`price-${price.key}`"
            >Price in gems
            <input
              :id="`price-${price.key}`"
              v-model.number="drafts[price.key]"
              type="number"
              min="0"
              max="100000"
              step="1"
              required
              :disabled="busy"
              :aria-label="`${price.label} price in gems`"
            />
          </label>
          <button class="feedback-button feedback-button--primary" :disabled="busy || drafts[price.key] === price.cost">
            Save price
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import type { GemAction, GemPrice } from '@/modules/GemPrices/api';

import { adminApi } from './adminApi';

const prices = ref<GemPrice[]>([]);
const drafts = ref<Partial<Record<GemAction, number | string>>>({});
const busy = ref(false),
  error = ref(''),
  notice = ref('');
async function load() {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    prices.value = await adminApi.gemPrices();
    drafts.value = Object.fromEntries(prices.value.map(({ key, cost }) => [key, cost]));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load prices.';
  } finally {
    busy.value = false;
  }
}
async function save(price: GemPrice) {
  const cost = drafts.value[price.key];
  if (busy.value || typeof cost !== 'number' || !Number.isInteger(cost) || cost < 0 || cost > 100000) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    prices.value = await adminApi.saveGemPrice(price.key, cost);
    drafts.value[price.key] = prices.value.find(({ key }) => key === price.key)?.cost ?? cost;
    notice.value = `${price.label}: saved at ${cost} gems.`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not save the price.';
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<style scoped>
.gem-price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.gem-price-grid h2 {
  font-size: 22px;
}
.gem-price-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
  margin-top: auto;
}
.gem-price-controls input,
.gem-price-controls button {
  height: 44px;
  box-sizing: border-box;
}
@media (max-width: 800px) {
  .gem-price-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
