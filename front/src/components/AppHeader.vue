<template>
  <header class="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
    <!-- Логотип / название -->
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold tracking-wide">✦ Fairy World</span>
    </div>

    <!-- Навигация -->
    <nav class="flex items-center gap-4 text-sm">
      <QBtn
        v-for="link in links"
        :key="link.to"
        flat
        dense
        :to="link.to"
        :label="link.label"
        :class="isActive(link.to) ? 'text-white' : 'text-gray-300'"
        size="md"
      />
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { QBtn } from 'quasar';

const route = useRoute();

const links = computed(() => [
  { to: '/', label: 'Ротовая' },
  { to: '/profile', label: 'Профиль' },
  { to: '/auth', label: 'Авторизация' },
]);

function isActive(to: string): boolean {
  return route.path.startsWith(to);
}
</script>

<style scoped>
header {
  border-bottom: 1px solid #374151;
}
</style>
