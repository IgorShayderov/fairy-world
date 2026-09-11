<template>
  <main class="flex h-screen min-h-0 flex-col overflow-hidden">
    <AppHeader :auth="true" />

    <RouterView class="min-h-0 flex-1 overflow-hidden" />
  </main>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppHeader from '@components/AppHeader.vue';
</script>

<style>
:root {
  --header-height: 50px;
}
</style>
