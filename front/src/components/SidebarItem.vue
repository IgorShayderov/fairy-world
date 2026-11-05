<template>
  <QCard
    @click="navigate"
    @keydown.enter.prevent="navigate"
    @keydown.space.prevent="navigate"
    role="link"
    tabindex="0"
    :aria-label="t(item.nameKey)"
    :aria-disabled="item.disabled || undefined"
    class="sidebar-item relative rounded-md border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d68a]"
    :data-attention="item.attention && !item.disabled ? 'true' : undefined"
    :aria-description="item.attention && !item.disabled ? item.attentionReason : undefined"
    :class="
      item.disabled
        ? 'cursor-not-allowed border-[#35515b] bg-[#102833] text-[#a9bec8] opacity-45'
        : isActive
          ? 'cursor-pointer border-[#a38a49] bg-[#173a45] text-[#f0d68a] shadow-[0_0_0_1px_rgba(240,214,138,0.08),0_5px_14px_rgba(0,0,0,0.22)]'
          : 'cursor-pointer border-[#35515b] bg-[#102833] text-[#a9bec8] shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:border-[#607a70] hover:bg-[#173641] hover:text-[#e9f1f2]'
    "
    :aria-current="isActive ? 'page' : undefined"
  >
    <QTooltip v-if="item.disabled && item.disabledReason" anchor="center left" self="center right">
      {{ item.disabledReason }}
    </QTooltip>
    <QTooltip v-else-if="item.attention && item.attentionReason" anchor="center left" self="center right">
      {{ item.attentionReason }}
    </QTooltip>
    <div class="flex h-10 flex-nowrap items-center overflow-hidden">
      <div class="relative flex w-[34px] shrink-0 items-center justify-center">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
        </svg>
        <span
          v-if="item.badge"
          class="absolute -top-2 -right-1 rounded-full bg-[#d9b961] px-1 text-[10px] font-bold text-[#0b2530]"
          :aria-label="`${item.badge} notifications`"
          >{{ item.badge > 99 ? '99+' : item.badge }}</span
        >
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
import { QCard, QTooltip } from 'quasar';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{
  item: {
    id: string;
    nameKey: string;
    route: string;
    icon: string;
    badge?: number;
    disabled?: boolean;
    disabledReason?: string;
    attention?: boolean;
    attentionReason?: string;
  };
  isExpanded: boolean;
}>();

const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const isActive = computed(() => !props.item.disabled && route.path === props.item.route);

const navigate = async () => {
  if (props.item.disabled) return;
  await router.push(props.item.route);
};
</script>

<style scoped>
.sidebar-item[data-attention='true']::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border: 2px solid #f0d68a;
  border-radius: inherit;
  box-shadow: inset 0 0 8px rgb(240 214 138 / 25%);
  animation: skill-points-pulse 3s ease-in-out infinite;
}
@keyframes skill-points-pulse {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sidebar-item[data-attention='true']::after {
    animation: none;
    opacity: 1;
  }
}
</style>
