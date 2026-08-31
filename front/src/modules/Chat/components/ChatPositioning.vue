<template>
  <ToggleExpandButton
    v-model="isExpanded"
    class="absolute left-1/2 z-30 -translate-x-1/2 transition-all duration-500 ease-in-out"
    :class="{
      'pointer-events-none -top-16 -translate-y-2 opacity-0': isClosed,
      '-top-4 translate-y-0 opacity-100': !isClosed,
    }"
  />
  <ToggleExpandButton
    v-model="isClosed"
    class="absolute z-30 -translate-x-1/2 transition-all duration-500 ease-in-out"
    :class="{
      'pointer-events-none -translate-y-2 opacity-0': isExpanded,
      'translate-y-0 opacity-100': !isExpanded,
      '-top-10': isClosed,
      '-top-4': !isClosed,
      'left-11/20': !isClosed,
      'left-1/2': isClosed,
    }"
    inverse
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import type { ChatPosition } from '@/shared/types/settings';

import ToggleExpandButton from '@/components/ToggleExpandButton.vue';

const $props = defineProps<{
  chatPosition: ChatPosition;
}>();
const $emits = defineEmits<{
  (event: 'set-positioning', value: ChatPosition): void;
}>();

const isExpanded = computed({
  get() {
    return $props.chatPosition === 'full-screen';
  },
  set(value) {
    $emits('set-positioning', value ? 'full-screen' : 'standard');
  },
});
const isClosed = computed({
  get() {
    return $props.chatPosition === 'closed';
  },
  set(value) {
    $emits('set-positioning', value ? 'closed' : 'standard');
  },
});
</script>
