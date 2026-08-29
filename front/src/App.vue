<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import AuthLayout from './layouts/AuthLayout.vue';
import UnauthLayout from './layouts/UnauthLayout.vue';

const $route = useRoute();

const layout = computed(() => {
  console.log($route);
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
