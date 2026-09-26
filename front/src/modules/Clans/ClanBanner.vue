<template>
  <div class="banner" :class="`banner--${size}`" :style="bannerStyle" aria-hidden="true">
    <div class="banner__top" />
    <div class="banner__cloth">
      <QIcon :name="banner?.icon ?? 'flag'" :size="iconSize" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed } from 'vue';

import type { ClanBanner } from './api';

const appearances: Record<string, { icon: string; colors: readonly [string, string, string] }> = {
  IRON_OATH: { icon: 'shield', colors: ['#812f39', '#321b28', '#efca72'] },
  VERDANT_HART: { icon: 'forest', colors: ['#28624f', '#102f31', '#a9df9a'] },
  MOONWATCH: { icon: 'dark_mode', colors: ['#3e4f82', '#171f3b', '#c9d9ff'] },
  FROSTBOUND: { icon: 'ac_unit', colors: ['#31809b', '#102b3d', '#bcecff'] },
  SUN_CROWN: { icon: 'wb_sunny', colors: ['#a45b26', '#44251f', '#ffe082'] },
};
const props = withDefaults(
  defineProps<{ code?: string | null; catalog?: ClanBanner[]; size?: 'small' | 'medium' | 'large' }>(),
  { code: null, catalog: () => [], size: 'small' }
);
const fallback = { icon: 'flag', colors: ['#60747b', '#233842', '#d7c48c'] as const };
const banner = computed(
  () =>
    props.catalog.find((entry) => entry.code === props.code) ??
    (props.code ? appearances[props.code] : null) ??
    fallback
);
const bannerStyle = computed(() => ({
  '--banner-main': banner.value.colors[0],
  '--banner-dark': banner.value.colors[1],
  '--banner-accent': banner.value.colors[2],
}));
const iconSize = computed(() => (props.size === 'large' ? '32px' : props.size === 'medium' ? '25px' : '18px'));
</script>

<style scoped>
.banner {
  position: relative;
  display: flex;
  width: 44px;
  height: 52px;
  flex: none;
  justify-content: center;
  padding-top: 7px;
}
.banner__top {
  position: absolute;
  top: 2px;
  left: 3px;
  width: 38px;
  height: 5px;
  border-radius: 999px;
  background: var(--banner-accent);
  box-shadow: 0 2px 7px rgb(0 0 0 / 35%);
}
.banner__cloth {
  display: flex;
  width: 32px;
  height: 42px;
  align-items: center;
  justify-content: center;
  color: var(--banner-accent);
  background: linear-gradient(145deg, var(--banner-main), var(--banner-dark));
  clip-path: polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 16%);
}
.banner--medium {
  width: 60px;
  height: 72px;
  padding-top: 8px;
}
.banner--medium .banner__top {
  width: 52px;
}
.banner--medium .banner__cloth {
  width: 44px;
  height: 60px;
}
.banner--large {
  width: 82px;
  height: 96px;
  padding-top: 10px;
}
.banner--large .banner__top {
  left: 5px;
  width: 72px;
  height: 7px;
}
.banner--large .banner__cloth {
  width: 60px;
  height: 82px;
}
</style>
