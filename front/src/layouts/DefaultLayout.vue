<template>
  <main class="h-screen flex-col">
    <AppHeader :auth="true" />

    <RouterView />
  </main>
</template>

<script setup lang="ts">
import AppHeader from '@components/AppHeader.vue';
import { RouterView } from 'vue-router';

</script>

<style>
:root {
  --header-height: 50px;
}
</style>
