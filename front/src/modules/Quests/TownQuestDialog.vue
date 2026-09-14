<template>
  <QDialog :model-value="true" @update:model-value="(open) => { if (!open) emit('close'); }">
    <div class="w-full max-w-2xl rounded-xl bg-white p-5 text-gray-800">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold">{{ t('menu.quests') }} — {{ townName }}</h2>
        <button class="text-sm text-blue-700 underline" @click="emit('close')">{{ t('fantasy.landmark.leave') }}</button>
      </div>
      <p v-if="error" role="alert" class="mb-3 text-sm text-red-700">{{ error }} <button class="underline" :disabled="pending" @click="load">{{ t('quests.retry') }}</button></p>
      <p v-if="loading" role="status" class="text-sm">{{ t('shop.loading') }}</p>
      <template v-else-if="journal">
        <p v-if="!journal.town" class="text-sm">{{ t('quests.visitTown') }}</p>
        <template v-else>
          <p class="mb-4 text-xs text-gray-500">{{ t('quests.dailyBoard') }}</p>
          <div class="mb-4 flex items-center justify-between gap-3 text-xs">
            <span>{{ t('quests.boardTimer', { time: remaining }) }}</span>
            <button class="rounded bg-violet-700 px-3 py-2 text-white disabled:opacity-50" :disabled="pending || (store.user?.gems ?? 0) < 30" @click="refresh">{{ t('quests.refresh') }}</button>
          </div>
          <p class="mb-3 text-xs">{{ t('quests.activeLimit', { count: journal.active.length }) }}</p>
          <p v-if="!offers.length" class="text-sm text-gray-500">{{ t('quests.noOffers') }}</p>
          <article v-for="quest in offers" :key="quest.id" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs">
            <h3 class="text-sm leading-snug font-semibold">{{ title(quest) }}</h3>
            <p class="mt-2">{{ description(quest) }}</p>
            <p v-if="quest.huntingLocation" class="mt-2 text-blue-700">{{ huntingLocation(quest) }}</p>
            <p class="mt-2 text-amber-800">{{ t('quests.reward', { gold: quest.rewardGold, experience: quest.rewardExperience ?? 0 }) }}</p>
            <p class="mt-1">{{ t('quests.itemChance') }}</p>
            <div class="mt-3 flex gap-3">
              <button class="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50" :disabled="pending || journal.active.length >= 5" @click="accept(quest.id)">{{ t('quests.accept') }}</button>
              <button class="rounded border border-gray-300 px-3 py-2 disabled:opacity-50" :disabled="pending" @click="dismissed.push(quest.id)">{{ t('quests.decline') }}</button>
            </div>
          </article>
          <button v-if="dismissed.length" class="text-xs text-blue-700 underline" :disabled="pending" @click="dismissed = []">{{ t('quests.showOffers') }}</button>
        </template>
      </template>
    </div>
  </QDialog>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog } from 'quasar';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import type { Quest, QuestJournal } from './api';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { acceptQuest, getQuests, refreshQuests } from './api';

defineProps<{ townName: string }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const { t } = useTranslation();
const store = useCurrentUserStore();
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval>;
onMounted(() => { clock = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => clearInterval(clock));
const remaining = computed(() => {
  const seconds = Math.max(0, Math.ceil((Date.parse(journal.value?.nextRefreshAt ?? '') - now.value) / 1000) || 0);
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
});
const journal = ref<QuestJournal | null>(null);
const loading = ref(false);
const pending = ref(false);
const error = ref('');
const dismissed = ref<number[]>([]);
const offers = computed(() => journal.value?.available.filter(q => !dismissed.value.includes(q.id)) ?? []);
const monsterName = (quest: Quest) => t(`quests.monsters.${quest.monsterType}`, { defaultValue: quest.monsterType });
const title = (quest: Quest) => quest.regionKey ? t('quests.huntTitle', { monster: monsterName(quest) }) : t(`quests.definitions.${quest.code}.title`, { defaultValue: quest.code });
const description = (quest: Quest) => quest.regionKey ? t('quests.huntDescription', { monster: monsterName(quest), count: quest.target }) : t(`quests.definitions.${quest.code}.description`, { count: quest.target });
const huntingLocation = (quest: Quest) => {
  const location = quest.huntingLocation;
  return location ? t('quests.huntingLocation', { region: t(`quests.regions.${location.key}`), town: location.nearby, x: location.x, y: location.y }) : '';
};
const load = async () => {
  loading.value = true;
  error.value = '';
  try { journal.value = await getQuests(); }
  catch { error.value = t('quests.error'); }
  finally { loading.value = false; }
};
const accept = async (id: number) => {
  if (pending.value) return;
  pending.value = true;
  try { await acceptQuest(id); await load(); }
  catch { error.value = t('quests.acceptError'); }
  finally { pending.value = false; }
};
onMounted(load);
watch(remaining, value => { if (value === '0:00:00' && journal.value?.nextRefreshAt && !pending.value && !loading.value) void load(); });
const refresh = async () => {
  if (pending.value) return;
  pending.value = true;
  try { await refreshQuests(); await store.fetchCurrentUser(true); dismissed.value = []; await load(); }
  catch { error.value = t('quests.refreshError'); }
  finally { pending.value = false; }
};
</script>
