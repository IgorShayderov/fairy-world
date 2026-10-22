<template>
  <div class="admin-page feedback-surface">
    <header class="admin-header">
      <div>
        <p class="feedback-muted text-xs tracking-widest uppercase">Fairy World · Administration</p>
        <h1>
          {{
            admin && section === 'users'
              ? 'Player management'
              : admin && section === 'prices'
                ? 'Gem prices'
                : 'Player feedback'
          }}
        </h1>
      </div>
      <div class="feedback-actions">
        <span v-if="admin" class="feedback-muted">{{ admin.name }}</span
        ><button v-if="admin" class="feedback-button" :disabled="busy" @click="logout">Admin log out</button
        ><RouterLink :to="routes.rootPath()" class="feedback-button">Back to game</RouterLink>
      </div>
    </header>
    <p v-if="error" role="alert" class="feedback-error mb-4">{{ error }}</p>
    <p v-if="notice" role="status" class="feedback-success mb-4">{{ notice }}</p>
    <p v-if="checking" role="status">Checking admin session…</p>
    <form v-else-if="!admin" class="admin-login feedback-card feedback-stack" @submit.prevent="login">
      <h2>Admin sign in</h2>
      <p class="feedback-muted">
        Only ADMIN accounts can sign in. This session is separate from your game login and expires after eight hours.
      </p>
      <label
        >Email<input
          v-model.trim="email"
          type="email"
          autocomplete="username"
          required
          maxlength="254"
          :disabled="busy"
      /></label>
      <div class="feedback-stack admin-password-field">
        <label for="admin-password">Password</label>
        <div class="admin-password-input">
          <input
            id="admin-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            maxlength="72"
            :disabled="busy"
          />
          <button
            type="button"
            class="admin-password-toggle"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :title="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            aria-controls="admin-password"
            :disabled="busy"
            @click="showPassword = !showPassword"
          >
            <QIcon :name="showPassword ? 'visibility_off' : 'visibility'" size="22px" aria-hidden="true" />
          </button>
        </div>
      </div>
      <button class="feedback-button feedback-button--primary" :disabled="busy">
        {{ busy ? 'Signing in…' : 'Sign in to admin' }}
      </button>
    </form>
    <template v-else>
      <nav class="feedback-actions admin-navigation" aria-label="Administration sections">
        <button
          class="feedback-button"
          :class="{ 'feedback-button--primary': section === 'users' }"
          :aria-pressed="section === 'users'"
          @click="section = 'users'"
        >
          Users
        </button>
        <button
          class="feedback-button"
          :class="{ 'feedback-button--primary': section === 'feedback' }"
          :aria-pressed="section === 'feedback'"
          @click="section = 'feedback'"
        >
          Feedback
        </button>
        <button
          class="feedback-button"
          :class="{ 'feedback-button--primary': section === 'prices' }"
          :aria-pressed="section === 'prices'"
          @click="section = 'prices'"
        >
          Gem prices
        </button>
      </nav>
      <AdminGemPrices v-if="section === 'prices'" />
      <AdminUsers v-else-if="section === 'users'" />
      <template v-else>
        <div class="admin-toolbar">
          <label
            >Status<select v-model="status" :disabled="busy" @change="changeFilter">
              <option value="">All feedback</option>
              <option value="OPEN">Open</option>
              <option value="REPLIED">Replied</option>
              <option value="CLOSED">Closed</option>
            </select></label
          >
          <button class="feedback-button" :disabled="busy" @click="refresh">Refresh</button>
          <span class="feedback-muted admin-submission-count">{{ data?.total ?? 0 }} submissions</span>
        </div>
        <div class="admin-columns">
          <section
            class="feedback-stack admin-submissions"
            :class="{ 'admin-empty': !data?.entries.length }"
            aria-label="Feedback submissions"
          >
            <p v-if="!data?.entries.length" class="feedback-muted">No feedback in this view.</p>
            <button
              v-for="entry in data?.entries"
              :key="entry.id"
              class="feedback-card feedback-stack text-left"
              :class="{ 'admin-selected': selected?.id === entry.id }"
              :disabled="busy"
              @click="select(entry.id)"
            >
              <div class="feedback-actions justify-between">
                <strong>{{ entry.user?.name ?? 'Player' }}</strong
                ><span class="feedback-status">{{ entry.status }}</span>
              </div>
              <span class="feedback-text line-clamp-3">{{ entry.message }}</span>
              <span class="feedback-muted"
                >{{ entry.category }} · {{ entry._count.replies }} replies ·
                {{ new Date(entry.createdAt).toLocaleDateString() }}</span
              >
            </button>
            <div v-if="data && data.total > data.pageSize" class="feedback-actions">
              <button
                class="feedback-button"
                :disabled="busy || page === 1"
                @click="
                  page--;
                  refresh();
                "
              >
                Previous</button
              ><span>Page {{ page }}</span
              ><button
                class="feedback-button"
                :disabled="busy || page * data.pageSize >= data.total"
                @click="
                  page++;
                  refresh();
                "
              >
                Next
              </button>
            </div>
          </section>
          <section
            class="feedback-stack admin-thread"
            :class="{ 'admin-empty': !selected }"
            aria-label="Selected feedback"
          >
            <template v-if="selected">
              <div class="feedback-actions justify-between">
                <h2>{{ selected.user?.name ?? 'Player' }}’s feedback</h2>
                <button
                  class="feedback-button"
                  :disabled="busy"
                  @click="setStatus(selected.status === 'CLOSED' ? 'OPEN' : 'CLOSED')"
                >
                  {{ selected.status === 'CLOSED' ? 'Reopen feedback' : 'Close feedback' }}
                </button>
              </div>
              <FeedbackThread :entry="selected" />
              <form v-if="selected.status !== 'CLOSED'" class="feedback-stack" @submit.prevent="reply">
                <label
                  >Reply to player<textarea
                    v-model="replyText"
                    rows="5"
                    required
                    maxlength="5000"
                    :disabled="busy"
                    placeholder="This reply will be visible to the player."
                  />
                </label>
                <div class="feedback-actions justify-between">
                  <span class="feedback-muted">{{ replyText.length }} / 5000</span
                  ><button class="feedback-button feedback-button--primary" :disabled="busy || !replyText.trim()">
                    {{ busy ? 'Saving…' : 'Send reply' }}
                  </button>
                </div>
              </form>
              <p v-else class="feedback-muted">This feedback is closed. Reopen it to send another reply.</p>
            </template>
            <p v-else class="feedback-muted">Select a submission to read it, reply, or change its status.</p>
          </section>
        </div>
      </template>
    </template>
  </div>
</template>
<script setup lang="ts">
import { QIcon } from 'quasar';
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { adminApi, adminToken, type AdminIdentity } from '@/modules/Feedback/adminApi';
import type { FeedbackDetail, FeedbackPage, FeedbackStatus } from '@/modules/Feedback/api';
import routes from '@/routes';

import AdminGemPrices from '@/modules/Feedback/AdminGemPrices.vue';
import AdminUsers from '@/modules/Feedback/AdminUsers.vue';
import FeedbackThread from '@/modules/Feedback/FeedbackThread.vue';
import '@/modules/Feedback/feedback.css';

const admin = ref<AdminIdentity>(),
  email = ref(''),
  password = ref('');
const showPassword = ref(false);
const section = ref<'feedback' | 'prices' | 'users'>('feedback');
const checking = ref(true),
  busy = ref(false),
  error = ref(''),
  notice = ref('');
const data = ref<FeedbackPage>(),
  selected = ref<FeedbackDetail>(),
  page = ref(1),
  status = ref<FeedbackStatus | ''>('');
const replyText = ref('');
let requestId = crypto.randomUUID();
watch(replyText, () => {
  requestId = crypto.randomUUID();
});
watch(adminToken, (token) => {
  if (!token) {
    section.value = 'feedback';
    admin.value = undefined;
    data.value = undefined;
    selected.value = undefined;
    replyText.value = '';
  }
});
const showError = (e: unknown) => {
  error.value = e instanceof Error ? e.message : 'Request failed';
};
async function load() {
  data.value = await adminApi.list(page.value, status.value || undefined);
}
async function refresh() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await load();
    if (selected.value) selected.value = await adminApi.get(selected.value.id);
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
async function login() {
  if (busy.value) return;
  showPassword.value = false;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    admin.value = await adminApi.login(email.value, password.value);
    password.value = '';
    await load();
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
async function logout() {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await adminApi.logout();
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
async function changeFilter() {
  page.value = 1;
  selected.value = undefined;
  replyText.value = '';
  await refresh();
}
async function select(id: string) {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    selected.value = await adminApi.get(id);
    replyText.value = '';
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
async function reply() {
  if (!selected.value || busy.value || !replyText.value.trim()) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await adminApi.reply(selected.value.id, requestId, replyText.value.trim());
    replyText.value = '';
    requestId = crypto.randomUUID();
    notice.value = 'Reply sent to the player.';
    selected.value = await adminApi.get(selected.value.id);
    await load();
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
async function setStatus(value: FeedbackStatus) {
  if (!selected.value || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await adminApi.status(selected.value.id, value);
    selected.value = await adminApi.get(selected.value.id);
    await load();
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  try {
    if (adminToken.value) {
      admin.value = await adminApi.me();
      await load();
    }
  } catch (e) {
    showError(e);
  } finally {
    checking.value = false;
  }
});
</script>
<style scoped>
.admin-page {
  min-height: 100dvh;
  padding: clamp(16px, 4vw, 48px);
  background: radial-gradient(ellipse at top left, #16353f, #071720 65%);
}
.admin-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #35515b;
}
.admin-header h1 {
  font-size: 36px;
  margin-top: 8px;
}
.admin-login {
  max-width: 440px;
  margin: 7vh auto;
  padding: 28px;
}
/* Browser autofill must retain the same dark palette as manually entered fields. */
.admin-login input:autofill,
.admin-login input:-webkit-autofill {
  box-shadow: 0 0 0 1000px #061922 inset !important;
  -webkit-text-fill-color: #e1ebe5;
  caret-color: #e1ebe5;
}
.admin-password-field {
  gap: 8px;
}
.admin-password-input {
  position: relative;
}
.admin-password-input input {
  padding-right: 56px;
}
.admin-password-toggle {
  position: absolute;
  top: 1px;
  right: 1px;
  bottom: 1px;
  width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0 7px 7px 0;
  background: #061922;
  color: #efd38a;
  cursor: pointer;
}
.admin-password-toggle:hover:not(:disabled) {
  background: #234550;
}
.admin-password-toggle:focus-visible {
  outline: 2px solid #f0ce77;
  outline-offset: 2px;
}
.admin-password-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.admin-navigation {
  margin-bottom: 24px;
}
.admin-toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 220px) auto minmax(0, 1fr);
  align-items: end;
  gap: 12px;
  margin-bottom: 24px;
}
.admin-toolbar select,
.admin-toolbar > button {
  height: 44px;
  box-sizing: border-box;
}
.admin-submission-count {
  display: flex;
  align-items: center;
  min-height: 44px;
}
.admin-columns {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 1.65fr);
  gap: 32px;
  align-items: start;
}
.admin-submissions {
  min-width: 0;
}
.admin-thread,
.admin-submissions.admin-empty {
  min-width: 0;
  padding: 24px;
  border: 1px solid #36545e;
  border-radius: 14px;
  background: #091e27;
}
.admin-empty {
  min-height: 112px;
  justify-content: center;
}
.admin-selected {
  border-color: #e3c371;
  background: #183c45;
}
.admin-columns button:focus-visible {
  outline: 2px solid #e3c371;
  outline-offset: 3px;
}
@media (max-width: 800px) {
  .admin-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-thread,
  .admin-submissions.admin-empty {
    padding: 16px;
  }
}
@media (max-width: 480px) {
  .admin-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .admin-submission-count {
    grid-column: 1 / -1;
    min-height: 0;
  }
}
</style>
