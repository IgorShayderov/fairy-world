<template>
  <header class="flex h-[var(--header-height)] items-center justify-between bg-gray-800 px-4 py-2 text-white">
    <div class="flex gap-2">
      <span class="text-lg font-bold tracking-wide">✦ {{ appName }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
const appName = import.meta.env.VITE_APP_NAME;
</script>
