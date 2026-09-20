<template>
  <article class="group rounded-xl border border-[#d8bd75]/25 bg-[#0b2530] p-4 shadow-lg">
    <div class="flex items-center gap-3">
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#e8c66f]/30 bg-[#071a23] p-2"
      >
        <img
          :src="`/icons/items/${item.icon}`"
          alt=""
          class="h-full w-full object-contain transition group-hover:scale-105"
        />
      </div>
      <div class="min-w-0">
        <h3 class="truncate font-serif text-lg font-semibold text-[#fff0bd]">{{ item.name }}</h3>
        <p class="mt-1 text-xs text-[#a9bfba]">{{ item.description }}</p>
      </div>
      <span class="ml-auto rounded-full bg-[#06151d] px-2.5 py-1 text-sm font-bold text-[#efca72]"
        >×{{ item.quantity }}</span
      >
    </div>
    <slot />
  </article>
</template>

<script setup lang="ts">
import type { CraftInventoryItem } from '@/modules/Inventory/types';

defineProps<{ item: CraftInventoryItem }>();
</script>
