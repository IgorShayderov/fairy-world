<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import AuthLayout from './layouts/AuthLayout.vue';
import UnauthLayout from './layouts/UnauthLayout.vue';
import { gameAudio } from './shared/audio/gameAudio';

let stopAudioListeners: (() => void) | undefined;
onMounted(() => {
  stopAudioListeners = gameAudio.listen();
});
onBeforeUnmount(() => stopAudioListeners?.());

const $route = useRoute();

const layout = computed(() => {
  switch ($route.meta.layout) {
    case 'AuthLayout':
      return AuthLayout;
    case 'UnauthLayout':
      return UnauthLayout;
    default:
      return null;
  }
});
</script>

<style>
@import 'tailwindcss' important;
@import 'sanitize.css';
</style>
