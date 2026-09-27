<template>
  <aside
    class="relative flex min-h-0 min-w-0 shrink-0 flex-col border-l border-[#35515b] bg-[linear-gradient(180deg,#0d2934_0%,#081b26_100%)] text-slate-200 shadow-[-12px_0_30px_rgba(0,0,0,0.28)] duration-300 ease-in-out *:transition-all"
    :class="isSidebarExpanded ? 'w-[25%] min-w-[200px]' : 'w-[50px]'"
  >
    <ToggleExpandButton
      v-model="isSidebarExpanded"
      class="absolute top-1/2 -left-4 z-20 flex h-8 w-8 -translate-y-1/2 -rotate-90 border-[#806f43]! bg-[#0b2530]! text-[#f0d68a]! shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
    />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-4">
      <h2
        class="mb-3 text-lg font-semibold whitespace-nowrap text-[#f0d68a] transition-all duration-300"
        :class="isSidebarExpanded ? 'max-w-[200px] px-4 opacity-100' : 'max-w-0 px-0 opacity-0'"
      >
        {{ t('menu.title') }}
      </h2>

      <div class="realm-menu-scroll flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-[7px]">
        <SidebarItem v-for="item in menuItems" :key="item.id" :item="item" :is-expanded="isSidebarExpanded" />
      </div>

      <div class="mt-3 shrink-0 border-t border-[#35515b]/80 px-[7px] pt-3 pb-4">
        <button
          type="button"
          class="group flex h-11 w-full items-center overflow-hidden rounded-md border border-[#71434b] bg-[linear-gradient(135deg,#351c25_0%,#241923_100%)] text-[#f3b8bd] shadow-[0_5px_14px_rgba(0,0,0,0.24)] transition-all duration-200 hover:border-[#b45a64] hover:bg-[linear-gradient(135deg,#4a202b_0%,#2f1a24_100%)] hover:text-[#ffd8db] focus-visible:ring-2 focus-visible:ring-[#d87982] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081b26] focus-visible:outline-none"
          :aria-label="t('auth.buttons.logout')"
          :title="t('auth.buttons.logout')"
          @click="handleLogout"
        >
          <span class="flex w-[34px] shrink-0 items-center justify-center">
            <svg
              class="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"
              />
            </svg>
          </span>

          <span
            class="truncate text-sm font-semibold tracking-wide transition-all duration-300"
            :class="isSidebarExpanded ? 'ml-2 max-w-[200px] opacity-100' : 'ml-0 max-w-0 opacity-0'"
          >
            {{ t('auth.buttons.logout') }}
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { signOut } from '@/modules/Auth/api';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { CRAFTING_MIN_LEVEL } from '@/modules/Crafting/api';
import { landmarks } from '@/modules/Game/composables/useMapObjects';
import routes from '@/routes';
import { StorageService } from '@services/storage.service';

import SidebarItem from './SidebarItem.vue';

import ToggleExpandButton from '@/components/ToggleExpandButton.vue';

const { t } = useTranslation();
const router = useRouter();
const isSidebarExpanded = ref(StorageService.get('sidebarExpanded'));

watch(isSidebarExpanded, (newValue) => {
  StorageService.set('sidebarExpanded', newValue);
});

const currentUser = useCurrentUserStore();
const handleLogout = async () => {
  try {
    await signOut();
  } catch (error) {
    console.error('Failed to log out:', error);
  } finally {
    await router.push(routes.loginPath());
  }
};

const inTown = computed(() => {
  const position = currentUser.user?.mapPosition;
  return (
    !!position &&
    landmarks.some(
      (landmark) =>
        ['city', 'capital', 'village'].includes(landmark.type) &&
        Math.hypot(position.x - landmark.x, position.y - landmark.y) <= 70
    )
  );
});
const menuItems = computed(() => [
  {
    id: 'home',
    nameKey: 'menu.home',
    route: routes.rootPath(),
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'profile',
    nameKey: 'menu.profile',
    route: routes.profilePath(),
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    id: 'pvp',
    nameKey: 'menu.pvp',
    route: routes.pvpPath(),
    icon: 'M12 2.75 4.5 5.8v5.05c0 4.75 3.08 8.91 7.5 10.4 4.42-1.49 7.5-5.65 7.5-10.4V5.8L12 2.75Zm0 4.1v10.3M8.75 12h6.5',
  },
  ...((currentUser.user?.level ?? 1) >= 10
    ? [
        {
          id: 'clans',
          nameKey: 'menu.clans',
          route: routes.clansPath(),
          icon: 'M4 21V4m0 1c4-2.5 7 2.5 12 0v9c-5 2.5-8-2.5-12 0m5 7v-5m6 5v-5M7 21h11',
        },
      ]
    : []),
  ...(currentUser.user?.currentShopId && inTown.value
    ? [
        {
          id: 'shop',
          nameKey: 'menu.shop',
          route: routes.shopPath(),
          icon: 'M3 3h2l2 10h10l4-8H5M9 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
        },
      ]
    : []),
  {
    id: 'quests',
    nameKey: 'menu.quests',
    route: routes.questsPath(),
    icon: 'M9 5H5v16h14V5h-4M9 3h6v4H9V3Zm-1 9h8m-8 4h6',
  },
  {
    id: 'leaderboard',
    nameKey: 'menu.leaderboard',
    route: routes.leaderboardPath(),
    icon: 'M3 20h18M4 20v-6h5v6M9 20V8h6v12M15 20v-9h5v9M11 5h2M12 4v2',
  },
  ...((currentUser.user?.level ?? 1) >= CRAFTING_MIN_LEVEL
    ? [
        {
          id: 'craft',
          nameKey: 'menu.craft',
          route: routes.craftPath(),
          icon: 'M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 7.7-8.3a4 4 0 0 0 5-5L17.4 9 15 6.6Z',
        },
      ]
    : []),
  {
    id: 'gems',
    nameKey: 'menu.gems',
    route: routes.gemShopPath(),
    icon: 'M3 8l5-5h8l5 5-9 13L3 8Zm0 0h18M8 3l4 18 4-18',
  },
  {
    id: 'settings',
    nameKey: 'menu.settings',
    route: routes.settingsPath(),
    icon: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  },
]);
</script>

<style scoped>
.realm-menu-scroll {
  scrollbar-color: #52717b #081b26;
}
</style>
