<template>
  <QCard @click="navigate" class="cursor-pointer rounded shadow-sm transition-colors hover:bg-gray-50">
    <div class="flex h-10 flex-nowrap items-center overflow-hidden">
      <div class="flex w-[34px] shrink-0 items-center justify-center">
        <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
        </svg>
      </div>

      <div
        class="truncate text-sm text-gray-600 transition-all duration-300"
        :class="isExpanded ? 'ml-2 max-w-[200px] opacity-100' : 'ml-0 max-w-0 opacity-0'"
      >
        {{ t(item.nameKey) }}
      </div>
    </div>
  </QCard>
</template>

<script setup lang="ts">
import { QCard } from 'quasar';
import { useTranslation } from 'i18next-vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
  item: { id: string; nameKey: string; route: string; icon: string };
  isExpanded: boolean;
}>();

const { t } = useTranslation();
const router = useRouter();

const navigate = () => {
  router.push(props.item.route);
};
</script>
