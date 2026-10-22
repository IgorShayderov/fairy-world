<template>
  <button
    v-if="user.user"
    class="notification-bell"
    :aria-label="t('menu.notifications')"
    :title="t('menu.notifications')"
    :aria-expanded="open"
    aria-haspopup="dialog"
    aria-controls="notification-drawer"
    @click="open = true"
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1"
      />
    </svg>
    <span
      v-if="attentionCount"
      class="notification-badge"
      :aria-label="t('notificationDrawer.attention', { count: attentionCount })"
    >
      {{ attentionCount > 99 ? '99+' : attentionCount }}
    </span>
  </button>
  <QDialog
    v-model="open"
    class="notification-overlay"
    position="right"
    full-height
    square
    :aria-label="t('menu.notifications')"
  >
    <div id="notification-drawer" class="notification-drawer">
      <header class="notification-drawer-header">
        <div>
          <p class="auction-kicker">{{ t('notificationDrawer.kicker') }}</p>
          <h2>{{ t('menu.notifications') }}</h2>
        </div>
        <button class="notification-close" autofocus :aria-label="t('notificationDrawer.close')" @click="open = false">
          <QIcon name="close" size="22px" />
        </button>
        <p class="notification-description">{{ t('notificationDrawer.description') }}</p>
      </header>
      <NotificationsInbox v-if="open" compact />
    </div>
  </QDialog>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog, QIcon } from 'quasar';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import NotificationsInbox from './NotificationsInbox.vue';
import { useNotificationSummary } from './useNotificationSummary';

const { t } = useTranslation();
const user = useCurrentUserStore();
const route = useRoute();
const open = ref(false);
const summary = useNotificationSummary();
// Read-but-unclaimed returns should still draw attention until collected or expired.
const attentionCount = computed(() => Math.max(summary.data.value?.unread ?? 0, summary.data.value?.pending ?? 0));
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  }
);
watch(
  () => user.user?.id,
  () => {
    open.value = false;
  }
);
watch(open, (value) => {
  if (value) void summary.refetch();
});
</script>

<style scoped>
:global(.notification-overlay .q-dialog__inner) {
  padding: 0;
}
.notification-bell,
.notification-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #65705d;
  border-radius: 10px;
  color: #f0d68a;
  background: #102b36;
  cursor: pointer;
}
.notification-bell {
  position: relative;
  margin-right: 4px;
}
.notification-bell:hover,
.notification-close:hover {
  background: #21434c;
  border-color: #dbbc6d;
}
.notification-bell:focus-visible,
.notification-close:focus-visible {
  outline: 2px solid #f0d68a;
  outline-offset: 2px;
}
.notification-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 18px;
  padding: 1px 4px;
  border: 2px solid #1f2937;
  border-radius: 20px;
  background: #e5c471;
  color: #0b2530;
  font-size: 10px;
  line-height: 14px;
  font-weight: 800;
}
.notification-drawer {
  display: flex;
  flex-direction: column;
  width: min(540px, 100vw);
  max-width: 100vw;
  height: 100%;
  min-height: 0;
  background: #081923;
  color: #d6e1de;
  border-left: 1px solid #706542;
  border-radius: 0;
  overflow: hidden;
  box-shadow: -16px 0 60px #0006;
}
.notification-drawer-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 24px 20px 20px;
  border-bottom: 1px solid #35515b;
  background: linear-gradient(135deg, #15333b, #0b222c);
}
.notification-drawer-header h2 {
  margin: 0;
  font:
    600 28px Georgia,
    serif;
  color: #f6e2a3;
}
.notification-description {
  width: 100%;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #a9bfba;
}
</style>
