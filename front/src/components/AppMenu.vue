<template>
  <aside
    class="relative flex min-h-0 min-w-0 shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out"
    :class="isSidebarExpanded ? 'w-[25%] min-w-[200px]' : 'w-[50px]'"
  >
    <ToggleExpandButton
      v-model="isSidebarExpanded"
      class="absolute top-1/2 -left-4 z-20 flex h-8 w-8 -translate-y-1/2 -rotate-90"
    />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden py-4">
      <h2
        class="mb-3 text-lg font-semibold whitespace-nowrap text-gray-700 transition-all duration-300"
        :class="isSidebarExpanded ? 'max-w-[200px] px-4 opacity-100' : 'max-w-0 px-0 opacity-0'"
      >
        {{ t('menu.title') }}
      </h2>

      <div class="flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-[7px]">
        <SidebarItem v-for="item in menuItems" :key="item.id" :item="item" :is-expanded="isSidebarExpanded" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTranslation } from 'i18next-vue';

import routes from '@/routes';
import SidebarItem from './SidebarItem.vue';
import { StorageService } from '@services/storage.service';
import ToggleExpandButton from '@/components/ToggleExpandButton.vue';

const { t } = useTranslation();
const isSidebarExpanded = ref(StorageService.get('sidebarExpanded'));

watch(isSidebarExpanded, (newValue) => {
  StorageService.set('sidebarExpanded', newValue);
});

const menuItems = [
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
    id: 'shop',
    nameKey: 'menu.shop',
    route: routes.shopPath(),
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  },
];
</script>
