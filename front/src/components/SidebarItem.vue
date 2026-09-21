<template>
  <QCard
    @click="navigate"
    class="cursor-pointer rounded-md border transition-all duration-200"
    :class="
      isActive
        ? 'border-[#a38a49] bg-[#173a45] text-[#f0d68a] shadow-[0_0_0_1px_rgba(240,214,138,0.08),0_5px_14px_rgba(0,0,0,0.22)]'
        : 'border-[#35515b] bg-[#102833] text-[#a9bec8] shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:border-[#607a70] hover:bg-[#173641] hover:text-[#e9f1f2]'
    "
    :aria-current="isActive ? 'page' : undefined"
  >
    <div class="flex h-10 flex-nowrap items-center overflow-hidden">
      <div class="flex w-[34px] shrink-0 items-center justify-center">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
        </svg>
      </div>

      <div
        class="truncate text-sm font-medium transition-all duration-300"
        :class="isExpanded ? 'ml-2 max-w-[200px] opacity-100' : 'ml-0 max-w-0 opacity-0'"
      >
        {{ t(item.nameKey) }}
      </div>
    </div>
  </QCard>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QCard } from 'quasar';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{
  item: { id: string; nameKey: string; route: string; icon: string };
  isExpanded: boolean;
}>();

const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const isActive = computed(() => route.path === props.item.route);

const navigate = async () => {
  await router.push(props.item.route);
};
</script>
