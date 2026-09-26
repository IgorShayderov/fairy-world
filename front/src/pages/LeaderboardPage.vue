<template>
  <main class="realm-page min-h-0 flex-1 overflow-auto p-5 sm:p-8">
    <div class="mx-auto max-w-5xl">
      <header
        class="rounded-2xl border border-[#d8bd75]/25 bg-[linear-gradient(135deg,#0d2b35,#0b2530_60%,#171d28)] p-6 shadow-xl"
      >
        <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">{{ t('menu.leaderboard') }}</p>
        <h1 class="mt-1 font-serif text-3xl font-semibold text-[#fff0bd]">
          {{ activeTab === 'players' ? t('leaderboard.title') : t('leaderboard.clansTitle') }}
        </h1>
        <p class="mt-2 text-sm text-[#a9bfba]">
          {{ activeTab === 'players' ? t('leaderboard.description') : t('leaderboard.clansDescription') }}
        </p>
      </header>

      <nav class="mt-5 flex gap-2 rounded-xl border border-[#d8bd75]/20 bg-[#071a23] p-1.5">
        <button
          class="leaderboard-tab"
          :class="{ active: activeTab === 'players' }"
          type="button"
          @click="activeTab = 'players'"
        >
          <QIcon name="person" size="18px" />
          {{ t('leaderboard.playersTab') }}
        </button>
        <button
          class="leaderboard-tab"
          :class="{ active: activeTab === 'clans' }"
          type="button"
          @click="activeTab = 'clans'"
        >
          <QIcon name="flag" size="18px" />
          {{ t('leaderboard.clansTab') }}
        </button>
      </nav>

      <p v-if="error" role="alert" class="mt-5 rounded-xl border border-red-400/30 bg-red-950/40 p-4 text-red-200">
        {{ error }}
      </p>

      <div
        v-else
        class="leaderboard-table mt-5 overflow-x-auto rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] shadow-xl"
      >
        <table v-if="activeTab === 'players'" class="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr>
              <th>{{ t('leaderboard.rank') }}</th>
              <th>{{ t('leaderboard.name') }}</th>
              <th>{{ t('leaderboard.level') }}</th>
              <th>{{ t('leaderboard.monsters') }}</th>
              <th>{{ t('leaderboard.dungeons') }}</th>
              <th>{{ t('leaderboard.quests') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in players"
              :key="player.userId"
              :class="{ 'current-entry': player.userId === currentUser.user?.id }"
              :aria-current="player.userId === currentUser.user?.id ? 'true' : undefined"
              :data-current-player="player.userId === currentUser.user?.id ? 'true' : undefined"
            >
              <td>
                <span class="rank-medal" :class="player.rank <= 3 ? `rank-medal--${player.rank}` : ''">
                  <QIcon v-if="player.rank <= 3" name="military_tech" size="18px" />
                  {{ player.rank }}
                </span>
              </td>
              <td class="font-semibold text-white">{{ player.name }}</td>
              <td>{{ player.level }}</td>
              <td>{{ player.killedMonsters }}</td>
              <td>{{ player.dungeonsCleared }}</td>
              <td>{{ player.questsCompleted }}</td>
            </tr>
            <tr v-if="!loading && !players.length">
              <td colspan="6" class="empty-row">{{ t('leaderboard.empty') }}</td>
            </tr>
          </tbody>
        </table>

        <table v-else class="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr>
              <th>{{ t('leaderboard.rank') }}</th>
              <th>{{ t('leaderboard.clan') }}</th>
              <th>{{ t('leaderboard.members') }}</th>
              <th>{{ t('leaderboard.activity') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in clans"
              :key="entry.id"
              :class="{ 'current-entry': entry.isCurrent }"
              :aria-current="entry.isCurrent ? 'true' : undefined"
              :data-current-clan="entry.isCurrent ? 'true' : undefined"
            >
              <td>
                <span class="rank-medal" :class="entry.rank <= 3 ? `rank-medal--${entry.rank}` : ''">
                  <QIcon v-if="entry.rank <= 3" name="military_tech" size="18px" />
                  {{ entry.rank }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <ClanBanner :code="entry.activeBannerCode" size="small" />
                  <strong class="text-white">[{{ entry.tag }}] {{ entry.name }}</strong>
                </div>
              </td>
              <td>
                <span class="inline-flex items-center gap-1.5">
                  <QIcon name="groups" size="17px" />
                  {{ entry.memberCount }}
                </span>
              </td>
              <td>
                <strong class="inline-flex items-center gap-1.5 text-[#efca72]">
                  <QIcon name="local_fire_department" size="17px" />
                  {{ entry.activityPoints }}
                </strong>
              </td>
            </tr>
            <tr v-if="!loading && !clans.length">
              <td colspan="4" class="empty-row">{{ t('leaderboard.noClans') }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="loading" class="flex items-center justify-center gap-3 py-14 text-[#efca72]">
          <QIcon name="hourglass_empty" size="26px" class="animate-spin" />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { QIcon } from 'quasar';
import { onMounted, ref } from 'vue';

import { usersApi, type LeaderboardEntry } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { clansApi, type ClanLeaderboardEntry } from '@/modules/Clans/api';

import ClanBanner from '@/modules/Clans/ClanBanner.vue';

const { t } = useTranslation();
const currentUser = useCurrentUserStore();
const activeTab = ref<'players' | 'clans'>('players');
const players = ref<LeaderboardEntry[]>([]);
const clans = ref<ClanLeaderboardEntry[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    [players.value, clans.value] = await Promise.all([usersApi.getLeaderboard(), clansApi.getLeaderboard()]);
  } catch {
    error.value = t('leaderboard.error');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.leaderboard-tab {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 0.65rem;
  color: #8ea8a7;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: 0.2s;
}

.leaderboard-tab:hover,
.leaderboard-tab.active {
  color: #fff0bd;
  background: #173a45;
}

.leaderboard-tab.active {
  box-shadow: inset 0 0 0 1px rgb(239 202 114 / 25%);
}

.leaderboard-table th {
  padding: 1rem;
  color: #8fa7a7;
  background: #071a23;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.leaderboard-table td {
  padding: 0.85rem 1rem;
  color: #c7d4d2;
  border-top: 1px solid rgb(216 189 117 / 13%);
}

.leaderboard-table tbody tr {
  transition: background-color 0.18s;
}

.leaderboard-table tbody tr:hover {
  background: #102f39;
}

.leaderboard-table tbody tr.current-entry {
  background: rgb(105 77 29 / 32%);
  box-shadow: inset 3px 0 #efca72;
}

.empty-row {
  padding: 2rem !important;
  color: #7e9a9b !important;
  text-align: center !important;
}

.rank-medal {
  display: inline-flex;
  min-width: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  color: #8fa7a7;
  font-weight: 800;
}

.rank-medal--1 {
  color: #ffd86f;
}

.rank-medal--2 {
  color: #d5e2e5;
}

.rank-medal--3 {
  color: #d5915d;
}
</style>
