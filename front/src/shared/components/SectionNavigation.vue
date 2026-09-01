<template>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-xl font-bold text-gray-800">{{ title }}</h2>

    <div class="flex items-center gap-4">
      <div class="flex gap-1">
        <QBtn
          round
          dense
          unelevated
          icon="chevron_left"
          class="bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
          :disable="disablePrev"
          @click="$emit('prev')"
        />

        <QBtn
          round
          dense
          unelevated
          icon="chevron_right"
          class="bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
          :disable="disableNext"
          @click="$emit('next')"
        />
      </div>

      <div v-if="totalPages > 1" class="flex gap-1.5">
        <span
          v-for="idx in totalPages"
          :key="idx"
          class="h-2 w-2 rounded-full transition-colors duration-300"
          :class="currentIndex === idx - 1 ? 'bg-blue-500' : 'bg-gray-300'"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QBtn } from 'quasar';

defineProps<{
  title: string;
  totalPages: number;
  currentIndex: number;
  disablePrev?: boolean;
  disableNext?: boolean;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>