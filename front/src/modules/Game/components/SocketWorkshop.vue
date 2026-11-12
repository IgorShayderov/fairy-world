<template>
  <section class="socket-workshop" aria-label="Equipment sockets">
    <ActionToasts :error="error" :success="notice" />
    <p>
      Each equipment item can hold one gem socket. Socketed items cannot be sold at auction, even when the socket is
      empty.
    </p>
    <button :disabled="pending" @click="load">Refresh sockets</button>
    <template v-if="offer">
      <p class="socket-price">{{ offer.gold.toLocaleString() }} gold · {{ offer.gems }} gems</p>
      <p>
        Add: {{ offer.prices.goldPerLevel }} gold × item level + {{ offer.prices.gems }} gems. Remove:
        {{ offer.prices.removalGoldPerLevel }} gold × item level.
      </p>
      <p v-if="!offer.items.length">No equipment available. Bring a weapon, shield, armor piece or accessory.</p>
      <article v-for="entry in offer.items" :key="entry.id" class="socket-item">
        <div>
          <strong>{{ entry.item.name }}</strong>
          <p>Level {{ entry.item.level }}{{ entry.isEquiped ? ' · Equipped' : '' }}</p>
          <p v-if="entry.hasSocket">
            ◆
            {{ entry.socketGemType ? `+${entry.socketGemValue} ${entry.socketGemType.toLowerCase()}` : 'Empty socket' }}
          </p>
        </div>
        <div class="socket-actions">
          <button v-if="!entry.hasSocket" :disabled="pending" @click="prepare(entry, 'add')">
            Add socket · {{ entry.item.level * offer.prices.goldPerLevel }} gold + {{ offer.prices.gems }} gems
          </button>
          <template v-else>
            <template v-if="!entry.socketGemType">
              <select v-model="chosenGems[entry.id]" :aria-label="`Gem for ${entry.item.name}`" :disabled="pending">
                <option value="">Choose an equipment gem</option>
                <option v-for="gem in offer.equipmentGems" :key="gem.id" :value="gem.id">
                  +{{ gem.value }} {{ gem.type.toLowerCase() }} · mine level {{ gem.mineLevel }}
                </option>
              </select>
              <button :disabled="pending" @click="prepare(entry, 'insert')">Insert gem · free</button>
            </template>
            <button :disabled="pending" @click="prepare(entry, 'remove')">
              Remove socket · {{ entry.item.level * offer.prices.removalGoldPerLevel }} gold
            </button>
          </template>
        </div>
      </article>
      <p v-if="!offer.equipmentGems.length">
        Mine equipment gems at your castle. The Gem Mine unlocks at Crownkeep level 5.
      </p>
    </template>
    <QDialog :model-value="!!confirmation" :persistent="pending" @update:model-value="!$event && (confirmation = null)">
      <section v-if="confirmation" class="socket-confirm" role="alertdialog" aria-label="Confirm socket change">
        <h3>
          {{
            confirmation.action === 'remove'
              ? 'Remove socket?'
              : confirmation.action === 'add'
                ? 'Add socket?'
                : 'Insert gem?'
          }}
        </h3>
        <p>{{ confirmation.name }}</p>
        <p v-if="confirmation.action === 'remove'">
          The socket and any inserted gem will be permanently destroyed. The item and its crafting bonus stay unchanged.
        </p>
        <p v-if="confirmation.action === 'insert'">
          This gem will be bound to the item. Removing the socket later destroys the gem.
        </p>
        <p>Cost: {{ confirmation.expectedCost }} gold + {{ confirmation.expectedGemCost }} gems</p>
        <button :disabled="pending" @click="confirmation = null">Cancel</button>
        <button :disabled="pending" @click="confirm">Confirm {{ confirmation.action }}</button>
      </section>
    </QDialog>
  </section>
</template>
<script setup lang="ts">
import { QDialog } from 'quasar';
import { onMounted, ref } from 'vue';

import ActionToasts from '@/components/ActionToasts';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import type { EquipmentGem } from '@/modules/Castles/api';
import routes from '@/routes';
import { api } from '@/shared/api';

type Entry = {
  id: number;
  isEquiped: boolean;
  hasSocket: boolean;
  socketGemType: string | null;
  socketGemValue: number | null;
  item: { name: string; level: number };
};
type Offer = {
  prices: { goldPerLevel: number; gems: number; removalGoldPerLevel: number };
  gold: number;
  gems: number;
  items: Entry[];
  equipmentGems: EquipmentGem[];
};
type Confirmation = {
  id: number;
  name: string;
  action: 'add' | 'remove' | 'insert';
  expectedCost: number;
  expectedGemCost: number;
  gemId?: string;
};
const url = `${routes.api.locations.blacksmithPath()}/sockets`;
const user = useCurrentUserStore();
const offer = ref<Offer | null>(null),
  confirmation = ref<Confirmation | null>(null),
  pending = ref(false),
  error = ref(''),
  notice = ref('');
const chosenGems = ref<Record<number, string>>({});
async function load() {
  pending.value = true;
  error.value = '';
  try {
    offer.value = (await api.get<Offer>(url)).data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load socket services';
  } finally {
    pending.value = false;
  }
}
function prepare(entry: Entry, action: Confirmation['action']) {
  if (!offer.value || pending.value) return;
  error.value = '';
  notice.value = '';
  if (action === 'insert' && !chosenGems.value[entry.id]) {
    error.value = 'Choose an equipment gem first';
    return;
  }
  const prices = offer.value.prices;
  confirmation.value = {
    id: entry.id,
    name: entry.item.name,
    action,
    expectedCost:
      action === 'add'
        ? prices.goldPerLevel * entry.item.level
        : action === 'remove'
          ? prices.removalGoldPerLevel * entry.item.level
          : 0,
    expectedGemCost: action === 'add' ? prices.gems : 0,
    ...(action === 'insert' ? { gemId: chosenGems.value[entry.id] } : {}),
  };
}
async function confirm() {
  if (!confirmation.value || pending.value) return;
  pending.value = true;
  error.value = '';
  notice.value = '';
  try {
    const { id, action, expectedCost, expectedGemCost, gemId } = confirmation.value;
    const body = { action, expectedCost, expectedGemCost, ...(gemId ? { gemId } : {}) };
    await api.post(`${url}/${id}`, body);
    confirmation.value = null;
    offer.value = (await api.get<Offer>(url)).data;
    await user.fetchCurrentUser(true);
    notice.value = 'Equipment socket updated.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not update the socket';
    confirmation.value = null;
  } finally {
    pending.value = false;
  }
}
onMounted(load);
</script>
<style scoped>
.socket-workshop {
  display: grid;
  gap: 12px;
}
.socket-workshop p {
  margin: 0;
}
.socket-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  padding: 18px 0;
  border-top: 1px solid #47636a;
}
.socket-actions {
  display: grid;
  gap: 8px;
}
button,
select {
  border: 1px solid #cfb575;
  border-radius: 8px;
  padding: 10px;
  color: #f1d58e;
  background: #102e37;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.socket-price {
  color: #f1d58e;
}
.socket-confirm {
  padding: 24px;
  width: 480px;
  max-width: 94vw;
  color: #d4e1dc;
  background: #102e37;
  border: 1px solid #cfb575;
  border-radius: 14px;
}
.socket-confirm button {
  margin-right: 8px;
}
@media (max-width: 600px) {
  .socket-item {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
