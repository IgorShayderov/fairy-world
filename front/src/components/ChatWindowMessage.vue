<template>
  <div class="flex flex-col" :class="amIAuthor ? 'items-end' : 'items-start'">
    <div
      class="block max-w-[80%] rounded p-2 text-sm"
      :class="amIAuthor ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'"
    >
      {{ $props.message.text }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import type { Message } from '@/modules/Chat/types';

const $props = defineProps<{
  message: Message;
}>();

const amIAuthor = ref(true);
</script>

<style lang="scss" module></style>
