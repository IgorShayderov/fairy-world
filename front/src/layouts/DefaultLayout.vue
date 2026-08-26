<template>
  <main class="h-screen flex-col">
    <AppHeader />

    <RouterView />
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
