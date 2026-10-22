<template>
  <section class="feedback-stack user-editor" aria-label="Player editor">
    <div class="feedback-card feedback-stack">
      <div class="feedback-actions justify-between">
        <h2>{{ user.name }} · #{{ user.id }}</h2>
        <button class="feedback-button" :disabled="busy" @click="$emit('reload')">Reload player</button>
      </div>
      <p class="feedback-muted">
        {{ user.email }} · {{ user.role }} · Created {{ new Date(user.createdAt).toLocaleDateString() }}
      </p>
      <p v-if="user.locked" role="alert" class="feedback-error">
        Editing is locked while the player is in a battle or dungeon party.
      </p>
      <p v-if="!user.gameProfile" class="feedback-error">This account has no game profile.</p>
      <label
        >Reason for next change<input
          v-model.trim="reason"
          maxlength="500"
          minlength="3"
          placeholder="Required for the audit history"
          :disabled="busy || user.locked"
      /></label>
    </div>
    <template v-if="draft && user.gameProfile">
      <form class="feedback-card feedback-stack" aria-label="Edit player profile" @submit.prevent="save">
        <h3>Profile & currencies</h3>
        <fieldset :disabled="busy || user.locked" class="editor-grid">
          <label>Name<input v-model.trim="draft.name" required minlength="2" maxlength="60" /></label>
          <label>Email<input v-model.trim="draft.email" required type="email" maxlength="254" /></label>
          <label v-for="field in fields" :key="field.key"
            >{{ field.label
            }}<input
              v-model.number="draft[field.key]"
              type="number"
              required
              :min="field.key === 'level' ? 1 : 0"
              :max="field.max"
              step="1"
          /></label>
        </fieldset>
        <p class="feedback-muted">
          XP is progress within the selected level, not lifetime XP.
          {{
            draft.level === 100 ? 'Level 100 requires 0 XP.' : `Keep XP below ${100 * draft.level * draft.level}.`
          }}
          Level changes update skill-point entitlement; free attribute points and base attributes are set explicitly
          below.
        </p>
        <h3>Base attributes</h3>
        <fieldset :disabled="busy || user.locked" class="editor-grid">
          <label v-for="attribute in draft.attributes" :key="attribute.name"
            >{{ attribute.name
            }}<input v-model.number="attribute.value" type="number" min="0" max="1000000" step="1" required
          /></label>
        </fieldset>
        <p class="feedback-muted">
          Skills: {{ user.skillPoints?.spent ?? 0 }} spent / {{ user.skillPoints?.total ?? 0 }} total · Monsters
          defeated: {{ user.gameProfile.killedMonsters }} · Dungeons cleared: {{ user.gameProfile.dungeonsCleared }}
        </p>
        <p v-if="user.gameProfile.premiumAccount" class="feedback-muted">
          Premium expiry: {{ new Date(user.gameProfile.premiumAccount.expiresAt).toLocaleString() }}
        </p>
        <button class="feedback-button feedback-button--primary" :disabled="cannotChange || !isDirty">
          Save profile
        </button>
      </form>
      <section class="feedback-card feedback-stack" aria-label="Player inventory">
        <h3>
          Inventory · {{ user.gameProfile.inventory.filter((entry) => !entry.isEquiped).length }} / 24 backpack slots
        </h3>
        <p class="feedback-muted">
          Items granted here go to the backpack. Removing a stack removes its entire quantity. Item definitions and
          other players’ copies are never modified.
        </p>
        <p v-if="!user.gameProfile.inventory.length" class="feedback-muted">Inventory is empty.</p>
        <article v-for="entry in user.gameProfile.inventory" :key="entry.id" class="inventory-row feedback-stack">
          <div>
            <strong>{{ entry.item.name }}</strong>
            <p class="feedback-muted">
              Entry #{{ entry.id }} · Item #{{ entry.itemId }} · {{ entry.item.rarity }} · Requires level
              {{ entry.item.requiredPlayerLevel }} · {{ entry.isEquiped ? `Equipped: ${entry.slot}` : 'Backpack' }}
            </p>
          </div>
          <p v-if="entry.upgradeType" class="feedback-muted">
            Upgrade: {{ entry.upgradeType }} +{{ entry.upgradeValue }}
          </p>
          <details>
            <summary>Item stats</summary>
            <p class="feedback-muted">{{ stats(entry.item) || 'No bonus stats' }}</p>
          </details>
          <div class="feedback-actions">
            <label class="quantity-label"
              >Quantity<input
                v-model.number="quantities[entry.id]"
                type="number"
                min="1"
                :max="entry.isEquiped ? 1 : 9999"
                step="1"
                :aria-label="`Quantity for ${entry.item.name} entry ${entry.id}`"
                :disabled="busy || user.locked || entry.isEquiped"
            /></label>
            <button
              class="feedback-button"
              :disabled="
                cannotChange ||
                entry.isEquiped ||
                quantities[entry.id] === entry.quantity ||
                !validQuantity(quantities[entry.id])
              "
              @click="changeItem(entry, 'quantity')"
            >
              Set quantity
            </button>
            <button
              v-if="entry.isEquiped"
              class="feedback-button"
              :disabled="cannotChange"
              @click="changeItem(entry, 'unequip')"
            >
              Unequip
            </button>
            <button class="feedback-button danger-button" :disabled="cannotChange" @click="changeItem(entry, 'remove')">
              Remove stack
            </button>
          </div>
        </article>
      </section>
      <section class="feedback-card feedback-stack" aria-label="Grant item">
        <h3>Add an item</h3>
        <form class="feedback-actions" @submit.prevent="searchItems(1)">
          <label class="search-label"
            >Search item catalog<input
              v-model="itemQuery"
              maxlength="100"
              placeholder="Name or item ID"
              :disabled="busy || catalogBusy" /></label
          ><button class="feedback-button" :disabled="busy || catalogBusy">Find items</button>
        </form>
        <p v-if="catalogError" role="alert" class="feedback-error">{{ catalogError }}</p>
        <p v-if="catalogBusy" role="status">Searching items…</p>
        <template v-if="catalog">
          <p class="feedback-muted">{{ catalog.total }} items · Page {{ catalog.page }}</p>
          <label v-if="catalog.entries.length"
            >Item to grant<select v-model.number="itemId" :disabled="busy || catalogBusy">
              <option :value="0" disabled>Select an item</option>
              <option v-for="item in catalog.entries" :key="item.id" :value="item.id">
                #{{ item.id }} {{ item.name }} · {{ item.rarity }} · Level {{ item.level }}
              </option>
            </select></label
          >
          <p v-if="chosen" class="feedback-muted">
            {{ chosen.equipmentType.join(', ') }} · Requires level {{ chosen.requiredPlayerLevel }} ·
            {{ stats(chosen) }}
          </p>
          <div class="feedback-actions">
            <button
              class="feedback-button"
              :disabled="busy || catalogBusy || catalog.page <= 1"
              @click="searchItems(catalog.page - 1)"
            >
              Previous items</button
            ><button
              class="feedback-button"
              :disabled="busy || catalogBusy || catalog.page * 20 >= catalog.total"
              @click="searchItems(catalog.page + 1)"
            >
              Next items
            </button>
          </div>
        </template>
        <form class="feedback-actions" @submit.prevent="grant">
          <label class="quantity-label"
            >Grant quantity<input
              v-model.number="grantQuantity"
              type="number"
              min="1"
              max="9999"
              step="1"
              required
              :disabled="busy || user.locked" /></label
          ><button
            class="feedback-button feedback-button--primary"
            :disabled="cannotChange || !chosen || !validQuantity(grantQuantity)"
          >
            Add to backpack
          </button>
        </form>
      </section>
    </template>
    <section class="feedback-card feedback-stack" aria-label="Admin change history">
      <h3>Recent admin changes</h3>
      <p v-if="!user.audits.length" class="feedback-muted">No admin changes recorded.</p>
      <article v-for="entry in user.audits" :key="entry.id" class="audit-row">
        <strong>{{ entry.action.replaceAll('_', ' ') }}</strong>
        <p class="feedback-muted">
          {{ entry.admin.name }} (#{{ entry.admin.id }}) · {{ new Date(entry.createdAt).toLocaleString() }}
        </p>
        <p class="feedback-text">{{ entry.reason }}</p>
      </article>
    </section>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type {
  AdminChange,
  AdminInventoryEdit,
  AdminInventoryEntry,
  AdminItem,
  AdminPageResult,
  AdminProfileEdit,
  AdminProfileValues,
  AdminUserDetail,
  AttributeName,
} from './adminUsersTypes';

import { adminApi } from './adminApi';

const props = defineProps<{ user: AdminUserDetail; busy: boolean }>();
const emit = defineEmits<{
  reload: [];
  dirty: [value: boolean];
  save: [input: AdminProfileEdit];
  grant: [input: AdminChange & { itemId: number; quantity: number }];
  inventory: [entryId: number, input: AdminInventoryEdit];
}>();
const reason = ref(''),
  draft = ref<Omit<AdminProfileEdit, keyof AdminChange>>(),
  initial = ref('');
const quantities = ref<Record<number, number>>({});
const fields: Array<{ key: keyof AdminProfileValues; label: string; max: number }> = [
  { key: 'level', label: 'Level', max: 100 },
  { key: 'experience', label: 'Experience (current level)', max: 1000000000 },
  { key: 'gold', label: 'Gold', max: 1000000000 },
  { key: 'gems', label: 'Gems', max: 1000000000 },
  { key: 'coinsOfHonour', label: 'Coins of honour', max: 1000000000 },
  { key: 'freeAttributes', label: 'Unspent attribute points', max: 1000000 },
];
const attributeNames: AttributeName[] = ['STRENGTH', 'AGILITY', 'ENDURANCE', 'WISDOM', 'CHARISMA'];
watch(
  () => props.user,
  (user) => {
    const profile = user.gameProfile;
    draft.value = profile
      ? {
          name: user.name,
          email: user.email,
          level: profile.level,
          experience: profile.experience,
          gold: profile.gold,
          gems: profile.gems,
          coinsOfHonour: profile.coinsOfHonour,
          freeAttributes: profile.freeAttributes,
          attributes: attributeNames.map((name) => ({
            name,
            value: profile.profileAttributes.find((entry) => entry.attribute.name === name)?.value ?? 5,
          })),
        }
      : undefined;
    initial.value = JSON.stringify(draft.value);
    reason.value = '';
    quantities.value = Object.fromEntries(profile?.inventory.map((entry) => [entry.id, entry.quantity]) ?? []);
  },
  { immediate: true }
);
const isDirty = computed(() => JSON.stringify(draft.value) !== initial.value);
watch(isDirty, (value) => emit('dirty', value));
const cannotChange = computed(
  () => props.busy || props.user.locked || reason.value.trim().length < 3 || !props.user.gameProfile
);
const change = () => ({ expectedState: props.user.stateToken, reason: reason.value });
const validQuantity = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9999;
const stats = (item: AdminItem) =>
  [...item.attributes, ...item.properties].map((stat) => `${stat.name}: ${stat.value}`).join(' · ');
function save() {
  if (!cannotChange.value && draft.value) emit('save', { ...draft.value, ...change() });
}
function changeItem(entry: AdminInventoryEntry, action: AdminInventoryEdit['action']) {
  if (cannotChange.value) return;
  if (
    action === 'remove' &&
    !window.confirm(
      `Remove all ${entry.quantity} × ${entry.item.name} (entry #${entry.id}) from ${props.user.name}? This cannot be undone automatically.`
    )
  )
    return;
  emit('inventory', entry.id, {
    ...change(),
    action,
    ...(action === 'quantity' ? { quantity: quantities.value[entry.id]! } : {}),
  });
}
const itemQuery = ref(''),
  catalogQuery = ref(''),
  catalogBusy = ref(false),
  catalogError = ref('');
const catalog = ref<AdminPageResult<AdminItem>>(),
  itemId = ref(0),
  grantQuantity = ref(1);
const chosen = computed(() => catalog.value?.entries.find((item) => item.id === itemId.value));
async function searchItems(page: number) {
  if (catalogBusy.value) return;
  catalogBusy.value = true;
  catalogError.value = '';
  itemId.value = 0;
  if (page === 1) catalogQuery.value = itemQuery.value;
  try {
    catalog.value = await adminApi.items(catalogQuery.value, page);
  } catch (e) {
    catalogError.value = e instanceof Error ? e.message : 'Could not load items.';
  } finally {
    catalogBusy.value = false;
  }
}
function grant() {
  if (cannotChange.value || !chosen.value || !validQuantity(grantQuantity.value)) return;
  if (!window.confirm(`Add ${grantQuantity.value} × ${chosen.value.name} to ${props.user.name} (#${props.user.id})?`))
    return;
  emit('grant', { ...change(), itemId: itemId.value, quantity: grantQuantity.value });
}
</script>
<style scoped>
.user-editor {
  min-width: 0;
  overflow-wrap: anywhere;
}
.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
.inventory-row,
.audit-row {
  border-top: 1px solid #36545e;
  padding-top: 16px;
}
.quantity-label {
  width: 100px;
}
.search-label {
  flex: 1;
  min-width: 160px;
}
.feedback-actions {
  align-items: end;
}
.danger-button {
  color: #ffc8bf;
  border-color: #97554c;
}
summary {
  cursor: pointer;
  color: #efd38a;
}
@media (max-width: 600px) {
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
