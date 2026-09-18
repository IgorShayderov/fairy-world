import { useTranslation } from 'i18next-vue';
import { useQuasar } from 'quasar';
import { ref } from 'vue';

import type { ShopItem, InventoryEntry } from '@/modules/Shop/types';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getShop, buyItem, refreshShop, sellItems } from '@/modules/Shop/api';

export function useShopActions() {
  const $q = useQuasar();
  const { t } = useTranslation();
  const currentUserStore = useCurrentUserStore();

  const shopItems = ref<ShopItem[]>([]);
  const inventory = ref<InventoryEntry[]>([]);
  const equippedItems = ref<InventoryEntry[]>([]);
  const gold = ref(0);
  const gems = ref(0);
  const shopGold = ref(0);
  const refreshCost = ref(10);
  const nextRestockAt = ref<string | null>(null);
  const shopId = ref(1);
  const accessError = ref(false);
  const shopName = ref('');
  const loading = ref(false);
  const token = ref<string | null>(null);

  const cart = ref<Record<number, number>>({});
  const sellQuantity = ref<Record<number, number>>({});
  const sellToast = ref({ show: false, message: '' });

  const loadData = async (forcePlayerRefresh = false) => {
    loading.value = true;
    accessError.value = false;
    try {
      const player = await currentUserStore.fetchCurrentUser(forcePlayerRefresh);
      if (!player.currentShopId) throw new Error('Visit a town to trade');
      shopId.value = player.currentShopId;
      const shop = await getShop(shopId.value);
      shopName.value = shop.name;
      const playerLevel = player.level ?? 1;
      shopItems.value = shop.items.filter(
        (item) => !item.requiredPlayerLevel || playerLevel >= item.requiredPlayerLevel
      );
      const stacks = new Map<number, InventoryEntry>();
      for (const entry of player.inventory) {
        const existing = stacks.get(entry.item.id);
        if (existing) existing.quantity += entry.quantity;
        else stacks.set(entry.item.id, { ...entry });
      }
      inventory.value = [...stacks.values()];
      equippedItems.value = player.equippedItems ?? [];
      gold.value = player.gold;
      gems.value = player.gems;
      shopGold.value = shop.gold;
      refreshCost.value = shop.refreshCost;
      nextRestockAt.value = shop.nextRestockAt;

      sellQuantity.value = {};
      for (const entry of inventory.value) {
        sellQuantity.value[entry.item.id] = 0;
      }
    } catch (e) {
      accessError.value = true;
      shopItems.value = [];
      cart.value = {};
      console.error('Failed to load shop data:', e);
    } finally {
      loading.value = false;
    }
  };

  const addToCart = (itemId: number) => {
    const item = shopItems.value.find((item) => item.id === itemId);

    if (!item) return;

    if (item.requiredPlayerLevel && (currentUserStore.user?.level ?? 1) < item.requiredPlayerLevel) {
      $q.notify({ type: 'negative', message: t('profile.requiredLevel', { level: item.requiredPlayerLevel }) });
      return;
    }

    const currentQuantity = cart.value[itemId] || 0;

    if (currentQuantity >= item.quantity) return;

    cart.value[itemId] = currentQuantity + 1;
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
    if (loading.value) return;
    const ids = Object.keys(cart.value);
    if (ids.length === 0) return;

    loading.value = true;
    try {
      for (const id of ids) {
        const qty = cart.value[Number(id)];
        if (!qty || !Number.isSafeInteger(qty)) throw new Error('Invalid quantity');
        const result = await buyItem(shopId.value, Number(id), qty);
        if (!result.success) throw new Error('Purchase failed');
      }
      $q.notify({ type: 'positive', message: t('shop.successBuy') });
      await loadData(true);
    } catch {
      $q.notify({ type: 'negative', message: t('shop.errorBuy') });
    } finally {
      loading.value = false;
      cart.value = {};
    }
  };

  const adjustSell = (itemId: number, _name: string, currentQty: number, delta: number) => {
    const selectedQuantity = sellQuantity.value[itemId] ?? 0;
    sellQuantity.value[itemId] = Math.min(currentQty, Math.max(0, selectedQuantity + delta));
  };

  const setSellQuantity = (itemId: number, currentQty: number, value: number) => {
    const quantity = Number.isFinite(value) ? Math.trunc(value) : 0;
    sellQuantity.value[itemId] = Math.min(currentQty, Math.max(0, quantity));
  };

  const sellTotal = () =>
    inventory.value.reduce((total, entry) => {
      const quantity = sellQuantity.value[entry.item.id] ?? 0;
      return total + (quantity > 0 ? Math.max(1, Math.floor(entry.item.price * 0.5 * quantity)) : 0);
    }, 0);

  const sellItemCount = () => Object.values(sellQuantity.value).reduce((total, quantity) => total + quantity, 0);
  const sellHasItems = () => sellItemCount() > 0;

  const sellSelectedItems = async () => {
    if (loading.value) return;
    const items = inventory.value.flatMap((entry) => {
      const quantity = sellQuantity.value[entry.item.id] ?? 0;
      return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= entry.quantity
        ? [{ itemId: entry.item.id, quantity }]
        : [];
    });
    if (items.length === 0) return;

    loading.value = true;
    try {
      const result = await sellItems(shopId.value, items);
      if (!result.success) throw new Error('Sell failed');

      sellToast.value.show = true;
      sellToast.value.message = t('shop.successSellMany', { quantity: result.quantity, price: result.earnedGold });

      setTimeout(() => {
        sellToast.value.show = false;
      }, 3000);
      await loadData(true);
    } catch {
      $q.notify({ type: 'negative', message: t('shop.errorSell') });
    } finally {
      loading.value = false;
    }
  };

  const addOneToSell = (itemId: number, name: string, currentQty: number) =>
    adjustSell(itemId, name, currentQty, 1);

  const refreshStock = async () => {
    if (loading.value || gems.value < refreshCost.value) return;

    loading.value = true;
    try {
      const result = await refreshShop(shopId.value);
      if (!result.success) throw new Error('Shop refresh failed');

      cart.value = {};
      $q.notify({ type: 'positive', message: t('shop.refreshSuccess') });
      await loadData(true);
    } catch {
      $q.notify({ type: 'negative', message: t('shop.refreshError') });
    } finally {
      loading.value = false;
    }
  };

  return {
    accessError,
    shopName,
    shopId,
    shopGold,
    nextRestockAt,
    shopItems,
    inventory,
    equippedItems,
    gold,
    gems,
    refreshCost,
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
    setSellQuantity,
    sellTotal,
    sellItemCount,
    sellHasItems,
    sellSelectedItems,
    addOneToSell,
    refreshStock,
    loadData,
  };
}
