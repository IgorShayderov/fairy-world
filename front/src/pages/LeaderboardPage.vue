<template>
  <main class="realm-page min-h-0 flex-1 overflow-auto p-6 sm:p-8">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-3xl font-bold">{{ t('leaderboard.title') }}</h1>
      <p class="mt-2 text-gray-500">{{ t('leaderboard.description') }}</p>
      <p v-if="error" role="alert" class="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{{ error }}</p>
      <div v-else class="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead class="bg-gray-100 text-sm text-gray-500">
            <tr>
              <th class="p-4">{{ t('leaderboard.rank') }}</th>
              <th class="p-4">{{ t('leaderboard.name') }}</th>
              <th class="p-4">{{ t('leaderboard.level') }}</th>
              <th class="p-4">{{ t('leaderboard.monsters') }}</th>
              <th class="p-4">{{ t('leaderboard.dungeons') }}</th>
              <th class="p-4">{{ t('leaderboard.quests') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in players"
              :key="player.userId"
              class="border-t border-gray-200 transition-colors"
              :class="player.userId === currentUser.user?.id ? 'bg-amber-100 text-amber-950' : 'hover:bg-gray-50'"
              :aria-current="player.userId === currentUser.user?.id ? 'true' : undefined"
              :data-current-player="player.userId === currentUser.user?.id ? 'true' : undefined"
            >
              <td class="p-4 font-bold text-amber-700">{{ player.rank }}</td>
              <td class="p-4 font-semibold">{{ player.name }}</td>
              <td class="p-4">{{ player.level }}</td>
              <td class="p-4">{{ player.killedMonsters }}</td>
              <td class="p-4">{{ player.dungeonsCleared }}</td>
              <td class="p-4">{{ player.questsCompleted }}</td>
            </tr>
            <tr v-if="!loading && !players.length">
              <td colspan="6" class="p-8 text-center text-gray-500">{{ t('leaderboard.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { onMounted, ref } from 'vue';

import { usersApi, type LeaderboardEntry } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

const { t } = useTranslation();
const currentUser = useCurrentUserStore();
const players = ref<LeaderboardEntry[]>([]);
const loading = ref(true);
const error = ref('');
onMounted(async () => {
  try {
    players.value = await usersApi.getLeaderboard();
  } catch {
    error.value = t('leaderboard.error');
  } finally {
    loading.value = false;
  }
});
</script>
