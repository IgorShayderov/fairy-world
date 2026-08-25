<template>
  <div class="flex h-screen flex-col bg-gray-900 text-white">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-gray-700 px-4 py-3 bg-gray-800">
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold">✦ Магазин</span>
        <span class="text-sm text-gray-400">|</span>
        <span class="text-lg">💰 {{ gold }} gold</span>
      </div>
      <div class="flex gap-2">
        <button class="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600" @click="goToProfile">
          Профиль
        </button>
        <button class="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600" @click="goToRoot">
          Рот
        </button>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Shop items (left) -->
      <main class="flex flex-col flex-1 overflow-hidden">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-2 bg-gray-800">
          <h2 class="text-lg font-semibold">Товары</h2>
          <button
            class="rounded bg-green-600 px-4 py-1 text-sm font-medium hover:bg-green-500 disabled:opacity-50"
            :disabled="!cartHasItems || loading"
            @click="buyFromCart"
          >
            Купить ({{ cartTotal() }}g)
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="loading && shopItems.length === 0" class="flex items-center justify-center h-32">
            <div class="text-gray-400">Загрузка...</div>
          </div>

          <div v-else class="grid grid-cols-2 gap-4">
            <div
              v-for="item in shopItems"
              :key="item.id"
              class="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <InventoryItem
                    :item="{ name: item.name, icon: item.icon, rarity: 'Обычный' }"
                    :slot-id="''"
                  />
                  <span class="font-medium">{{ item.name }}</span>
                </div>
                <span class="text-green-400 font-bold">{{ item.price }}g</span>
              </div>
              <p class="text-xs text-gray-400">{{ item.description || '—' }}</p>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <button
                    class="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                    @click="removeFromCart(item.id)"
                  >
                    −
                  </button>
                  <span class="min-w-[24px] text-center">{{ cart[item.id] || 0 }}</span>
                  <button
                    class="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                    @click="addToCart(item.id)"
                  >
                    +
                  </button>
                </div>
                <span class="text-xs text-gray-500">В наличии: {{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart summary -->
        <div v-if="Object.keys(cart).length > 0" class="border-t border-gray-700 px-4 py-2 bg-gray-800">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-300">В корзине:</span>
            <span class="font-bold">{{ cartTotal() }} gold</span>
          </div>
        </div>
      </main>

      <!-- Inventory (right) -->
      <aside class="w-[300px] border-l border-gray-700 bg-gray-800 p-4 overflow-y-auto">
        <h2 class="mb-3 text-lg font-semibold">Инвентарь</h2>

        <div v-if="!token" class="text-gray-400 text-sm">
          Войдите в систему, чтобы видеть инвентарь
        </div>

        <div v-else-if="inventory.length === 0" class="text-gray-400 text-sm">
          Инвентарь пуст
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="inv in inventory"
            :key="inv.id"
            class="flex items-center justify-between rounded bg-gray-700 p-2"
          >
            <div class="flex items-center gap-2">
              <InventoryItem
                :item="{ name: inv.item.name, icon: inv.item.icon, rarity: 'Обычный' }"
                :slot-id="''"
              />
              <span class="truncate max-w-[120px] text-sm">{{ inv.item.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-300">×{{ inv.quantity }}</span>
              <div class="flex items-center gap-1">
                <button
                  class="rounded bg-gray-600 px-1 py-0.5 text-xs hover:bg-gray-500"
                  @click="adjustSell(inv.item.id, inv.item.name, inv.quantity, -1)"
                >
                  −
                </button>
                <input
                  v-model.number="sellQuantity[inv.item.id]"
                  type="number"
                  min="1"
                  :max="inv.quantity"
                  class="w-[40px] rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-center text-xs text-white"
                />
                <button
                  class="rounded bg-gray-600 px-1 py-0.5 text-xs hover:bg-gray-500"
                  @click="adjustSell(inv.item.id, inv.item.name, inv.quantity, 1)"
                >
                  +
                </button>
              </div>
              <button
                class="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-500"
                :disabled="!sellQuantity[inv.item.id] || loading"
                @click="sellFromInventory(inv.item.id, inv.item.name, sellQuantity[inv.item.id])"
              >
                Продать
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Sell result toast -->
    <div v-if="sellToast.show" class="fixed bottom-4 right-4 animate-bounce rounded bg-green-600 px-4 py-2 text-sm">
      {{ sellToast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { getShopItems, buyItem, getInventory, sellItem } from '@/modules/Shop/api';
import InventoryItem from '@/components/InventoryItem.vue';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  icon: string;
}

interface InventoryEntry {
  id: number;
  item: ShopItem;
  quantity: number;
}

const $q = useQuasar();
const router = useRouter();

const shopItems = ref<ShopItem[]>([]);
const inventory = ref<InventoryEntry[]>([]);
const gold = ref(100);
const loading = ref(false);
const token = ref<string | null>(null);
const cart = reactive<Record<number, number>>({});
const sellQuantity = reactive<Record<number, number>>({});
const sellToast = reactive({ show: false, message: '' });

onMounted(async () => {
  token.value = localStorage.getItem('access_token');
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const [items, inv] = await Promise.all([getShopItems(), getInventory()]);
    shopItems.value = items;
    inventory.value = inv;
    // Reset sell quantities
    sellQuantity = {} as Record<number, number>;
    for (const entry of inventory.value) {
      sellQuantity[entry.item.id] = entry.quantity;
    }
  } catch (e) {
    console.error('Failed to load shop data:', e);
  } finally {
    loading.value = false;
  }
};

const addToCart = (itemId: number) => {
  cart[itemId] = (cart[itemId] || 0) + 1;
};

const removeFromCart = (itemId: number) => {
  if (cart[itemId]) {
    cart[itemId]--;
    if (cart[itemId] <= 0) {
      delete cart[itemId];
    }
  }
};

const cartTotal = () => {
  let total = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const item = shopItems.value.find((i) => i.id === Number(id));
    if (item) total += item.price * qty;
  }
  return total;
};

const cartHasItems = () => Object.keys(cart).length > 0;

const buyFromCart = async () => {
  const ids = Object.keys(cart);
  if (ids.length === 0) return;

  loading.value = true;
  try {
    for (const id of ids) {
      const qty = cart[id];
      const result = await buyItem(Number(id), qty);
      if (!result.success) throw new Error('Purchase failed');
    }
    $q.notify({ type: 'positive', message: 'Покупка успешна!' });
    await loadData();
  } catch {
    $q.notify({ type: 'negative', message: 'Недостаточно золота или ошибка' });
  } finally {
    loading.value = false;
    cart = {} as Record<number, number>;
  }
};

const adjustSell = (itemId: number, name: string, currentQty: number, delta: number) => {
  const newVal = (sellQuantity[itemId] || currentQty) + delta;
  if (newVal >= 1 && newVal <= currentQty) {
    sellQuantity[itemId] = newVal;
  }
};

const sellFromInventory = async (itemId: number, name: string, quantity: number) => {
  if (!quantity || quantity <= 0) return;

  loading.value = true;
  try {
    const result = await sellItem(name, quantity);
    if (!result.success) throw new Error('Sell failed');
    sellToast.show = true;
    sellToast.message = `Продано ${quantity}× ${name} за ${result.sellValue}g`;
    setTimeout(() => { sellToast.show = false; }, 3000);
    await loadData();
  } catch {
    $q.notify({ type: 'negative', message: 'Ошибка продажи' });
  } finally {
    loading.value = false;
  }
};

const goToProfile = () => router.push('/profile');
const goToRoot = () => router.push('/');
</script>
