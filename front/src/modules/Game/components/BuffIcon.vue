<template>
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" class="h-full w-full drop-shadow-md">
    <template v-if="type === 'DAMAGE'">
      <path d="M12 33 7 41l8-4 3-8" fill="#f59e0b" />
      <path d="m17 28 19-22 5-1-1 6-20 20Z" fill="#fff1d6" stroke="#fbbf24" stroke-width="1.5" />
      <path d="m20 27 17-18" stroke="#fb923c" stroke-width="2" />
      <path d="m12 24 13 12M9 38l4 4" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
      <path d="m8 9 2 4 4 2-4 1-2 4-1-4-4-1 4-2Z" fill="#fb923c" />
    </template>
    <template v-else-if="type === 'DEFENSE'">
      <path
        d="M24 4c5 5 11 7 16 8v12c0 10-9 16-16 20C17 40 8 34 8 24V12c5-1 11-3 16-8Z"
        fill="#123c58"
        stroke="#7dd3fc"
        stroke-width="2"
      />
      <path d="M24 10v27c6-4 10-8 10-14v-7c-4-1-7-3-10-6Z" fill="#38bdf8" opacity=".6" />
      <path d="m24 15 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" fill="#e0f2fe" />
    </template>
    <template v-else>
      <path d="M24 8 6 13v24l18-5 18 5V13Z" fill="#3b2764" stroke="#c4b5fd" stroke-width="2" stroke-linejoin="round" />
      <path
        d="M24 12v20M11 19l8-2m-8 8 8-2m-8 8 8-2m10-12 8 2m-8 4 8 2m-8 4 8 2"
        stroke="#ddd6fe"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path d="m24 1 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fde68a" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { ActiveBuff } from '@/modules/Auth/api/users';

defineProps<{ type: ActiveBuff['type'] }>();
</script>
