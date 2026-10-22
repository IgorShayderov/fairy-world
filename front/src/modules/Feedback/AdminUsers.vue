<template>
  <section class="feedback-stack admin-users" aria-label="User management">
    <div class="feedback-actions justify-between">
      <p class="feedback-muted">
        Find a player, adjust their profile, or manage their inventory. All changes are audited.
      </p>
      <button class="feedback-button" :disabled="busy" @click="showCreate = !showCreate">
        {{ showCreate ? 'Close creation form' : 'Create user' }}
      </button>
    </div>
    <p v-if="error" role="alert" class="feedback-error">{{ error }}</p>
    <p v-if="notice" role="status" class="feedback-success">{{ notice }}</p>
    <form v-if="showCreate" class="feedback-card feedback-stack" aria-label="Create user" @submit.prevent="create">
      <h2>Create player account</h2>
      <p class="feedback-muted">
        Starts at level 1 with normal attributes and starter sword/shield. No admin access is granted.
      </p>
      <div class="create-fields">
        <label>Name<input v-model.trim="newUser.name" required minlength="2" maxlength="60" :disabled="busy" /></label>
        <label
          >Email<input
            v-model.trim="newUser.email"
            type="email"
            required
            maxlength="254"
            autocomplete="off"
            :disabled="busy"
        /></label>
        <label
          >Initial password<input
            v-model="newUser.password"
            :type="showPassword ? 'text' : 'password'"
            required
            minlength="15"
            maxlength="30"
            autocomplete="new-password"
            :disabled="busy"
        /></label>
      </div>
      <div class="feedback-actions">
        <button
          type="button"
          class="feedback-button"
          :aria-pressed="showPassword"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? 'Hide password' : 'Show password' }}</button
        ><span class="feedback-muted">Use a strong password with upper/lowercase letters, a number and a symbol.</span>
      </div>
      <label
        >Creation reason<input v-model.trim="newUser.reason" required minlength="3" maxlength="500" :disabled="busy"
      /></label>
      <button class="feedback-button feedback-button--primary" :disabled="busy">Create player</button>
    </form>
    <div class="users-columns">
      <aside class="feedback-stack">
        <form class="feedback-stack feedback-card" @submit.prevent="search">
          <label
            >Search users<input v-model="query" placeholder="Name, email or ID" maxlength="100" :disabled="busy"
          /></label>
          <button class="feedback-button" :disabled="busy">Search</button>
        </form>
        <p class="feedback-muted">{{ result?.total ?? 0 }} users · Page {{ page }}</p>
        <p v-if="busy && !result" role="status">Loading users…</p>
        <p v-else-if="!result?.entries.length" class="feedback-muted">No users found.</p>
        <button
          v-for="user in result?.entries"
          :key="user.id"
          class="feedback-card user-row"
          :class="{ selected: selected?.id === user.id }"
          :aria-pressed="selected?.id === user.id"
          :disabled="busy"
          @click="select(user.id)"
        >
          <strong
            >{{ user.name }} <span class="feedback-muted">#{{ user.id }}</span></strong
          >
          <span>{{ user.email }}</span>
          <span class="feedback-muted"
            >{{ user.role }} · {{ user.gameProfile ? `Level ${user.gameProfile.level}` : 'No game profile' }}</span
          >
        </button>
        <div class="feedback-actions">
          <button class="feedback-button" :disabled="busy || page <= 1" @click="changePage(-1)">Previous</button
          ><button
            class="feedback-button"
            :disabled="busy || !result || page * 20 >= result.total"
            @click="changePage(1)"
          >
            Next
          </button>
        </div>
      </aside>
      <AdminUserEditor
        v-if="selected"
        :key="selected.id"
        :user="selected"
        :busy="busy"
        @dirty="dirty = $event"
        @reload="select(selected.id)"
        @save="save"
        @grant="grant"
        @inventory="inventory"
      />
      <div v-else class="feedback-card feedback-muted">Select a player to view their profile and inventory.</div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import type {
  AdminChange,
  AdminInventoryEdit,
  AdminPageResult,
  AdminProfileEdit,
  AdminUserCreate,
  AdminUserDetail,
  AdminUserSummary,
} from './adminUsersTypes';

import { adminApi } from './adminApi';
import AdminUserEditor from './AdminUserEditor.vue';

const query = ref(''),
  activeQuery = ref(''),
  page = ref(1),
  busy = ref(false),
  error = ref(''),
  notice = ref('');
const result = ref<AdminPageResult<AdminUserSummary>>(),
  selected = ref<AdminUserDetail>();
const dirty = ref(false),
  showCreate = ref(false),
  showPassword = ref(false);
const newUser = ref<AdminUserCreate>({ name: '', email: '', password: '', reason: '' });
const discard = () => !dirty.value || window.confirm('Discard unsaved profile changes?');
async function run(operation: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await operation();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Request failed.';
  } finally {
    busy.value = false;
  }
}
const load = async () => {
  result.value = await adminApi.users(activeQuery.value, page.value);
};
async function search() {
  await run(async () => {
    activeQuery.value = query.value;
    page.value = 1;
    await load();
  });
}
async function changePage(delta: number) {
  await run(async () => {
    page.value += delta;
    await load();
  });
}
async function select(id: number) {
  if (!discard()) return;
  await run(async () => {
    selected.value = await adminApi.user(id);
    dirty.value = false;
  });
}
async function create() {
  if (!discard()) return;
  await run(async () => {
    selected.value = await adminApi.createUser(newUser.value);
    newUser.value = { name: '', email: '', password: '', reason: '' };
    showPassword.value = false;
    showCreate.value = false;
    dirty.value = false;
    notice.value = `Created ${selected.value.name} (#${selected.value.id}).`;
    page.value = 1;
    activeQuery.value = '';
    query.value = '';
    await load();
  });
}
async function save(input: AdminProfileEdit) {
  if (!selected.value || !window.confirm(`Save profile changes for ${selected.value.name} (#${selected.value.id})?`))
    return;
  await run(async () => {
    selected.value = await adminApi.updateUser(selected.value!.id, input);
    dirty.value = false;
    notice.value = 'Profile saved.';
    await load();
  });
}
async function grant(input: AdminChange & { itemId: number; quantity: number }) {
  if (!selected.value || !discard()) return;
  await run(async () => {
    selected.value = await adminApi.grantItem(selected.value!.id, input);
    dirty.value = false;
    notice.value = 'Item added to the backpack.';
  });
}
async function inventory(entryId: number, input: AdminInventoryEdit) {
  if (!selected.value || !discard()) return;
  await run(async () => {
    selected.value = await adminApi.updateInventory(selected.value!.id, entryId, input);
    dirty.value = false;
    notice.value = 'Inventory updated.';
  });
}
onMounted(() => run(load));
</script>
<style scoped>
.users-columns {
  display: grid;
  grid-template-columns: minmax(230px, 300px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.users-columns > * {
  min-width: 0;
}
.user-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  color: inherit;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.user-row.selected {
  border-color: #e2c571;
  background: #1c3b43;
}
.user-row:disabled {
  opacity: 0.6;
}
.create-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 1000px) {
  .users-columns,
  .create-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
