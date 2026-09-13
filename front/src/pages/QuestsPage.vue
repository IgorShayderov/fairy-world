<template>
  <div class="h-full min-h-0 w-full overflow-y-auto bg-gray-50 p-6 text-gray-800">
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
        <section>
          <h2 class="mb-4 text-xl font-bold">{{ t('quests.active') }} ({{ journal.active.length }})</h2>
          <p v-if="!journal.active.length" class="text-gray-500">{{ t('quests.noActive') }}</p>
          <div class="grid gap-4 md:grid-cols-2">
            <article v-for="entry in journal.active" :key="entry.questId" class="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
              <h3 class="font-bold">{{ title(entry.quest) }}</h3>
              <p class="mt-2 text-sm text-gray-600">{{ description(entry.quest) }}</p>
              <div class="mt-4 flex justify-between text-sm"><span>{{ t('quests.progress') }}</span><span>{{ entry.progress }} / {{ entry.quest.target }}</span></div>
              <progress class="mt-2 h-3 w-full accent-blue-600" :value="entry.progress" :max="entry.quest.target" :aria-label="title(entry.quest)" />
              <p class="mt-3 text-sm text-amber-700">{{ t('quests.reward', { gold: entry.quest.rewardGold }) }}</p>
            </article>
          </div>
        </section>
        <section>
          <h2 class="mb-4 text-xl font-bold">{{ t('quests.board') }}<span v-if="journal.town"> — {{ journal.town.name }}</span></h2>
          <p v-if="!journal.town" class="text-gray-500">{{ t('quests.visitTown') }}</p>
          <template v-else>
            <p class="mb-4 text-sm text-gray-500">{{ t('quests.optional') }}</p>
            <p v-if="!offers.length" class="text-gray-500">{{ t('quests.noOffers') }}</p>
            <div class="grid gap-4 md:grid-cols-2">
              <article v-for="quest in offers" :key="quest.id" class="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 class="font-bold">{{ title(quest) }}</h3>
                <p class="mt-2 text-sm">{{ description(quest) }}</p>
                <p class="mt-3 text-sm text-amber-800">{{ t('quests.reward', { gold: quest.rewardGold }) }}</p>
                <div class="mt-4 flex gap-3">
                  <button class="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50" :disabled="pending !== null" @click="accept(quest.id)">{{ t('quests.accept') }}</button>
                  <button class="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50" :disabled="pending !== null" @click="dismissed.push(quest.id)">{{ t('quests.decline') }}</button>
                </div>
              </article>
            </div>
            <button v-if="dismissed.length" class="mt-4 text-sm text-blue-700 underline" @click="dismissed = []">{{ t('quests.showOffers') }}</button>
          </template>
        </section>
        <section>
          <h2 class="mb-4 text-xl font-bold">{{ t('quests.completed') }} ({{ journal.completed.length }})</h2>
          <p v-if="!journal.completed.length" class="text-gray-500">{{ t('quests.noCompleted') }}</p>
          <div class="grid gap-4 md:grid-cols-2">
            <article v-for="entry in journal.completed" :key="entry.questId" class="rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 class="font-bold">✓ {{ title(entry.quest) }}</h3>
              <p class="mt-2 text-sm">{{ description(entry.quest) }} — {{ entry.progress }} / {{ entry.quest.target }}</p>
              <p class="mt-3 text-sm text-green-700">{{ t('quests.rewardPaid', { gold: entry.quest.rewardGold }) }}</p>
              <p class="mt-2 text-xs text-gray-500">{{ new Date(entry.completedAt!).toLocaleString() }}</p>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, onMounted, ref } from 'vue';

import type { Quest, QuestJournal } from '@/modules/Quests/api';
import { acceptQuest, getQuests } from '@/modules/Quests/api';

const { t } = useTranslation();
const journal = ref<QuestJournal | null>(null);
const loading = ref(false);
const pending = ref<number | null>(null);
const error = ref('');
const dismissed = ref<number[]>([]);
const offers = computed(() => journal.value?.available.filter(q => !dismissed.value.includes(q.id)) ?? []);
const title = (quest: Quest) => t(`quests.definitions.${quest.code}.title`, { defaultValue: quest.code });
const description = (quest: Quest) => t(`quests.definitions.${quest.code}.description`, { count: quest.target });
const load = async () => {
  loading.value = true;
  error.value = '';
  try { journal.value = await getQuests(); }
  catch { error.value = t('quests.error'); }
  finally { loading.value = false; }
};
const accept = async (id: number) => {
  if (pending.value !== null) return;
  pending.value = id;
  error.value = '';
  try {
    await acceptQuest(id);
    await load();
  } catch { error.value = t('quests.acceptError'); }
  finally { pending.value = null; }
};
onMounted(load);
</script>
