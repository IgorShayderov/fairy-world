import { onMounted, ref } from 'vue';

import { getGemPrices, type GemAction } from './api';

export function useGemPrices(enabled = true) {
  const prices = ref<Partial<Record<GemAction, number>>>({});
  const loadPrices = async () => {
    try {
      prices.value = Object.fromEntries((await getGemPrices()).map(({ key, cost }) => [key, cost]));
    } catch {
      // Do not offer a paid action using an assumed or stale price.
      prices.value = {};
    }
  };
  onMounted(() => {
    if (enabled) void loadPrices();
  });
  return { prices, loadPrices };
}
