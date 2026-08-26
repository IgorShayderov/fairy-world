import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTranslation } from 'i18next-vue';
import { getShopItems, buyItem, getInventory, sellItem } from '@/modules/Shop/api';
import type { ShopItem, InventoryEntry } from '@/modules/Shop/types';

export function useShopActions() {
  const $q = useQuasar();
  const { t } = useTranslation();

  const shopItems = ref<ShopItem[]>([]);
  const inventory = ref<InventoryEntry[]>([]);
  const gold = ref(100);
  const loading = ref(false);
  const token = ref<string | null>(null);

  const cart = ref<Record<number, number>>({});
  const sellQuantity = ref<Record<number, number>>({});
  const sellToast = ref({ show: false, message: '' });

  const loadData = async () => {
    loading.value = true;
    try {
      const [items, inv] = await Promise.all([getShopItems(), getInventory()]);
      shopItems.value = items;
      inventory.value = inv;

      sellQuantity.value = {};
      for (const entry of inventory.value) {
        sellQuantity.value[entry.item.id] = entry.quantity;
      }
    } catch (e) {
      console.error('Failed to load shop data:', e);
    } finally {
      loading.value = false;
    }
  };

  const addToCart = (itemId: number) => {
    cart.value[itemId] = (cart.value[itemId] || 0) + 1;
  };

  const removeFromCart = (itemId: number) => {
    if (cart.value[itemId]) {
      cart.value[itemId]--;
      if (cart.value[itemId] <= 0) {
        delete cart.value[itemId];
      }
    }
  };

  const cartTotal = () => {
    let total = 0;
    for (const [id, qty] of Object.entries(cart.value)) {
      const item = shopItems.value.find((i) => i.id === Number(id));
      if (item) total += item.price * qty;
    }
    return total;
  };

  const cartHasItems = () => Object.keys(cart.value).length > 0;

  const buyFromCart = async () => {
    const ids = Object.keys(cart.value);
    if (ids.length === 0) return;

    loading.value = true;
    try {
      for (const id of ids) {
        const qty = cart.value[Number(id)];
        const result = await buyItem(Number(id), qty);
        if (!result.success) throw new Error('Purchase failed');
      }
      $q.notify({ type: 'positive', message: t('shop.successBuy') });
      await loadData();
    } catch {
      $q.notify({ type: 'negative', message: t('shop.errorBuy') });
    } finally {
      loading.value = false;
      cart.value = {};
    }
  };

  const adjustSell = (itemId: number, name: string, currentQty: number, delta: number) => {
    const newVal = (sellQuantity.value[itemId] || currentQty) + delta;
    if (newVal >= 1 && newVal <= currentQty) {
      sellQuantity.value[itemId] = newVal;
    }
  };

  const sellFromInventory = async (itemId: number, name: string, quantity: number) => {
    if (!quantity || quantity <= 0) return;

    loading.value = true;
    try {
      const result = await sellItem(name, quantity);
      if (!result.success) throw new Error('Sell failed');

      sellToast.value.show = true;
      sellToast.value.message = t('shop.successSell', { quantity, name, price: result.sellValue });

      setTimeout(() => {
        sellToast.value.show = false;
      }, 3000);
      await loadData();
    } catch {
      $q.notify({ type: 'negative', message: t('shop.errorSell') });
    } finally {
      loading.value = false;
    }
  };

  return {
    shopItems,
    inventory,
    gold,
    loading,
    token,
    cart,
    sellQuantity,
    sellToast,
    addToCart,
    removeFromCart,
    cartTotal,
    cartHasItems,
    buyFromCart,
    adjustSell,
    sellFromInventory,
    loadData,
  };
}
