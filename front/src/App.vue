<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const $route = useRoute();

const layout = computed(() => {
  switch ($route.meta.layout) {
    default:
      return 'div';
  }
});
</script>
