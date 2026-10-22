<template>
  <button
    v-if="user.user"
    class="feedback-launch"
    :aria-label="t('feedback.button')"
    :title="t('feedback.button')"
    @click="open = true"
  >
    <QIcon name="rate_review" size="20px" /><span class="hidden sm:inline">{{ t('feedback.button') }}</span>
  </button>
  <QDialog v-model="open" :persistent="busy" aria-label="Game feedback">
    <div class="feedback-dialog feedback-surface feedback-stack">
      <header class="feedback-actions justify-between">
        <h2>Game feedback</h2>
        <button class="feedback-button" :disabled="busy" aria-label="Close feedback" @click="open = false">
          <QIcon name="close" />
        </button>
      </header>
      <p class="feedback-muted">
        Tell us about your experience, report a bug, or suggest an improvement. Admin replies appear in My feedback.
      </p>
      <nav class="feedback-actions" aria-label="Feedback views">
        <button
          class="feedback-button"
          :class="{ 'feedback-button--primary': tab === 'write' }"
          :disabled="busy"
          @click="tab = 'write'"
        >
          Write feedback
        </button>
        <button
          class="feedback-button"
          :class="{ 'feedback-button--primary': tab === 'history' }"
          :disabled="busy"
          @click="showHistory"
        >
          My feedback
        </button>
      </nav>
      <p v-if="error" role="alert" class="feedback-error">{{ error }}</p>
      <p v-if="notice" role="status" class="feedback-success">{{ notice }}</p>
      <form v-if="tab === 'write'" class="feedback-stack" @submit.prevent="submit">
        <label
          >Category<select v-model="category" :disabled="busy">
            <option value="EXPERIENCE">Game experience</option>
            <option value="BUG">Bug report</option>
            <option value="IDEA">Suggestion</option>
          </select></label
        >
        <label
          >Experience rating (optional)<select v-model.number="rating" :disabled="busy">
            <option :value="0">Not rated</option>
            <option v-for="score in 5" :key="score" :value="score">{{ score }} / 5</option>
          </select></label
        >
        <label
          >Your feedback<textarea
            v-model="message"
            required
            minlength="10"
            maxlength="5000"
            rows="6"
            :disabled="busy"
            placeholder="What worked well? What should we improve?"
          />
        </label>
        <div class="feedback-actions justify-between">
          <span class="feedback-muted">{{ message.length }} / 5000 · Up to 5 submissions per day</span
          ><button class="feedback-button feedback-button--primary" :disabled="busy || message.trim().length < 10">
            {{ busy ? 'Sending…' : 'Send feedback' }}
          </button>
        </div>
      </form>
      <template v-else>
        <div class="feedback-actions">
          <button v-if="selected" class="feedback-button" :disabled="busy" @click="selected = undefined">
            Back to list</button
          ><button class="feedback-button" :disabled="busy" @click="load">Refresh</button>
        </div>
        <p v-if="busy" role="status">Loading…</p>
        <FeedbackThread v-else-if="selected" :entry="selected" />
        <template v-else>
          <p v-if="!history?.entries.length" class="feedback-muted">No feedback sent yet.</p>
          <button
            v-for="entry in history?.entries"
            :key="entry.id"
            class="feedback-card feedback-stack text-left"
            @click="select(entry.id)"
          >
            <span class="feedback-status">{{ entry.status }} · {{ entry._count.replies }} replies</span
            ><span class="feedback-text line-clamp-2">{{ entry.message }}</span
            ><time class="feedback-muted">{{ new Date(entry.createdAt).toLocaleString() }}</time>
          </button>
          <div v-if="history && history.total > history.pageSize" class="feedback-actions">
            <button
              class="feedback-button"
              :disabled="page === 1"
              @click="
                page--;
                load();
              "
            >
              Previous</button
            ><span>Page {{ page }}</span
            ><button
              class="feedback-button"
              :disabled="page * history.pageSize >= history.total"
              @click="
                page++;
                load();
              "
            >
              Next
            </button>
          </div>
        </template>
      </template>
    </div>
  </QDialog>
</template>
<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog, QIcon } from 'quasar';
import { ref, watch } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { feedbackApi, type FeedbackCategory, type FeedbackDetail, type FeedbackPage } from './api';
import FeedbackThread from './FeedbackThread.vue';
import './feedback.css';

const { t } = useTranslation();
const user = useCurrentUserStore();
const open = ref(false),
  busy = ref(false),
  error = ref(''),
  notice = ref('');
const tab = ref<'write' | 'history'>('write');
const category = ref<FeedbackCategory>('EXPERIENCE'),
  rating = ref(0),
  message = ref('');
const page = ref(1),
  history = ref<FeedbackPage>(),
  selected = ref<FeedbackDetail>();
let requestId = crypto.randomUUID();
watch([category, rating, message], () => {
  requestId = crypto.randomUUID();
});
async function submit() {
  if (busy.value || message.value.trim().length < 10) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await feedbackApi.submit({
      requestId,
      category: category.value,
      message: message.value.trim(),
      ...(rating.value ? { rating: rating.value } : {}),
    });
    message.value = '';
    rating.value = 0;
    notice.value = 'Thank you! Your feedback was sent. You can read admin replies in My feedback.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not send feedback. Your draft is saved here.';
  } finally {
    busy.value = false;
  }
}
async function load() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    if (selected.value) selected.value = await feedbackApi.get(selected.value.id);
    else history.value = await feedbackApi.list(page.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load feedback';
  } finally {
    busy.value = false;
  }
}
async function showHistory() {
  tab.value = 'history';
  selected.value = undefined;
  page.value = 1;
  notice.value = '';
  await load();
}
async function select(id: string) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    selected.value = await feedbackApi.get(id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load feedback';
  } finally {
    busy.value = false;
  }
}
watch(open, (value) => {
  if (value && tab.value === 'history') void load();
});
</script>
<style scoped>
.feedback-launch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid #65705d;
  border-radius: 10px;
  color: #f0d68a;
  background: #102b36;
  cursor: pointer;
  font-size: 12px;
}
.feedback-launch:hover {
  background: #21434c;
}
.feedback-launch:focus-visible {
  outline: 2px solid #f0d68a;
  outline-offset: 2px;
}
.feedback-dialog {
  width: 620px;
  max-width: calc(100vw - 32px);
  padding: 24px;
  border: 1px solid #776842;
}
</style>
