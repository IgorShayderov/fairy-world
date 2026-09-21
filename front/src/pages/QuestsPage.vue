<template>
  <div class="realm-page h-full min-h-0 w-full overflow-y-auto p-6">
    <div class="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 class="text-3xl font-bold">{{ t('quests.title') }}</h1>
        <p class="mt-2 text-gray-500">{{ t('quests.intro') }}</p>
      </header>
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-red-700">
        {{ error }} <button class="ml-3 underline" :disabled="loading" @click="load">{{ t('quests.retry') }}</button>
      </p>
      <p v-if="loading" role="status">{{ t('shop.loading') }}</p>
      <template v-else-if="journal">
        <QTabs v-model="tab" align="left" active-color="primary" indicator-color="primary" no-caps>
          <QTab name="active" :label="`${t('quests.active')} (${journal.active.length})`" />
          <QTab name="completed" :label="`${t('quests.completed')} (${journal.completed.length})`" />
        </QTabs>
        <QTabPanels v-model="tab" class="bg-transparent">
          <QTabPanel name="active" class="p-0">
            <p v-if="!journal.active.length" class="text-gray-500">{{ t('quests.noActive') }}</p>
            <div class="grid gap-4 md:grid-cols-2">
              <article
                v-for="entry in journal.active"
                :key="entry.questId"
                class="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"
              >
                <h3 class="text-sm leading-snug font-semibold">{{ title(entry.quest) }}</h3>
                <p class="mt-2 text-sm text-gray-600">{{ description(entry.quest) }}</p>
                <p v-if="entry.quest.huntingLocation" class="mt-2 text-sm text-blue-700">
                  {{ huntingLocation(entry.quest) }}
                </p>
                <div class="mt-4 flex justify-between text-sm">
                  <span>{{ t('quests.progress') }}</span
                  ><span>{{ entry.progress }} / {{ entry.quest.target }}</span>
                </div>
                <progress
                  class="mt-2 h-3 w-full accent-blue-600"
                  :value="entry.progress"
                  :max="entry.quest.target"
                  :aria-label="title(entry.quest)"
                />
                <p class="mt-3 text-sm text-amber-700">
                  {{
                    t('quests.reward', { gold: entry.quest.rewardGold, experience: entry.quest.rewardExperience ?? 0 })
                  }}
                </p>
                <p v-if="!entry.quest.destinationTownId" class="mt-1 text-xs text-gray-500">
                  {{ t('quests.itemChance') }}
                </p>
                <template v-if="!entry.quest.isPrimary">
                  <button
                    v-if="entry.quest.destinationTownId"
                    class="mt-3 block text-sm text-blue-600 underline"
                    :disabled="pending !== null || journal.town?.id !== entry.quest.destinationTownId"
                    @click="deliver(entry.questId)"
                  >
                    {{ t('quests.deliver') }}
                  </button>
                  <button
                    v-if="cancelingId !== entry.questId"
                    class="mt-4 text-sm text-red-700 underline"
                    :disabled="pending !== null"
                    @click="cancelingId = entry.questId"
                  >
                    {{ t('quests.cancel') }}
                  </button>
                  <div v-else class="mt-4 rounded-lg bg-red-50 p-3 text-sm">
                    <p>{{ t('quests.cancelWarning') }}</p>
                    <div class="mt-3 flex gap-4">
                      <button
                        class="text-red-700 underline"
                        :disabled="pending !== null"
                        @click="cancel(entry.questId)"
                      >
                        {{ t('quests.confirmCancel') }}
                      </button>
                      <button class="underline" :disabled="pending !== null" @click="cancelingId = null">
                        {{ t('quests.keep') }}
                      </button>
                    </div>
                  </div>
                </template>
              </article>
            </div>
          </QTabPanel>
          <QTabPanel name="completed" class="p-0">
            <p v-if="!journal.completed.length" class="text-gray-500">{{ t('quests.noCompleted') }}</p>
            <div class="grid gap-4 md:grid-cols-2">
              <article
                v-for="entry in journal.completed"
                :key="entry.questId"
                class="rounded-xl border border-green-200 bg-green-50 p-5"
              >
                <h3 class="text-sm leading-snug font-semibold">✓ {{ title(entry.quest) }}</h3>
                <p class="mt-2 text-sm">
                  {{ description(entry.quest) }} — {{ entry.progress }} / {{ entry.quest.target }}
                </p>
                <p class="mt-3 text-sm text-green-700">
                  {{
                    t('quests.rewardPaid', {
                      gold: entry.quest.rewardGold,
                      experience: entry.quest.rewardExperience ?? 0,
                    })
                  }}
                </p>
                <p class="mt-2 text-xs text-gray-500">{{ new Date(entry.completedAt!).toLocaleString() }}</p>
              </article>
            </div>
          </QTabPanel>
        </QTabPanels>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { QTab, QTabs, QTabPanel, QTabPanels } from 'quasar';
import { onMounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import type { Quest, QuestJournal } from '@/modules/Quests/api';
import { cancelQuest, deliverQuest, getQuests } from '@/modules/Quests/api';

const { t } = useTranslation();
const currentUser = useCurrentUserStore();
const deliver = async (id: number) => {
  if (pending.value !== null) return;
  pending.value = id;
  error.value = '';
  try {
    await deliverQuest(id);
    await currentUser.fetchCurrentUser(true);
    await load();
  } catch {
    error.value = t('quests.deliveryError');
  } finally {
    pending.value = null;
  }
};
const journal = ref<QuestJournal | null>(null);
const tab = ref('active');
const loading = ref(false);
const pending = ref<number | null>(null);
const cancelingId = ref<number | null>(null);
const error = ref('');
const monsterName = (quest: Quest) => t(`quests.monsters.${quest.monsterType}`, { defaultValue: quest.monsterType });
const title = (quest: Quest) =>
  quest.destination
    ? t('quests.deliveryTitle', { town: quest.destination.name })
    : quest.regionKey
      ? t('quests.huntTitle', { monster: monsterName(quest) })
      : t(`quests.definitions.${quest.code}.title`, { defaultValue: quest.code });
const description = (quest: Quest) =>
  quest.destination
    ? t('quests.deliveryDescription', { town: quest.destination.name, x: quest.destination.x, y: quest.destination.y })
    : quest.regionKey
      ? t('quests.huntDescription', { monster: monsterName(quest), count: quest.target })
      : t(`quests.definitions.${quest.code}.description`, { count: quest.target });
const huntingLocation = (quest: Quest) => {
  const location = quest.huntingLocation;
  return location
    ? t('quests.huntingLocation', {
        region: t(`quests.regions.${location.key}`),
        town: location.nearby,
        x: location.x,
        y: location.y,
      })
    : '';
};
const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    journal.value = await getQuests();
  } catch {
    error.value = t('quests.error');
  } finally {
    loading.value = false;
  }
};
onMounted(load);
const cancel = async (id: number) => {
  if (pending.value !== null) return;
  pending.value = id;
  error.value = '';
  try {
    await cancelQuest(id);
    cancelingId.value = null;
    await load();
  } catch {
    error.value = t('quests.cancelError');
  } finally {
    pending.value = null;
  }
};
</script>
