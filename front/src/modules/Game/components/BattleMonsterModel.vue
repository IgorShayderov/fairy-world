<template>
  <span
    class="battle-monster-model"
    :class="{ 'is-attacking': attacking, 'has-attack-pose': attackPoseLoaded }"
    :style="{ '--attack-delay': `${delay}ms` }"
    aria-hidden="true"
  >
    <img class="monster-idle" :src="src" alt="" />
    <img
      class="monster-strike"
      :src="attackSrc"
      alt=""
      @load="attackPoseLoaded = true"
      @error="attackPoseLoaded = false"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{ src: string; attacking: boolean; delay: number }>();
const attackSrc = computed(() => `${props.src.replace(/\.png$/, '-attack.png')}?v=2`);
const attackPoseLoaded = ref(false);
watch(attackSrc, () => {
  attackPoseLoaded.value = false;
});
</script>

<style scoped>
.battle-monster-model {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.battle-monster-model img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.monster-strike {
  opacity: 0;
}
.is-attacking {
  animation: monster-approach 950ms ease-in-out var(--attack-delay);
}
.is-attacking.has-attack-pose .monster-idle {
  animation: monster-guard 950ms steps(1, end) var(--attack-delay);
}
.is-attacking.has-attack-pose .monster-strike {
  animation: monster-swing 950ms steps(1, end) var(--attack-delay);
}
@keyframes monster-approach {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(5%);
  }
  48%,
  65% {
    transform: translateX(-28%);
  }
}
@keyframes monster-guard {
  0%,
  85%,
  100% {
    opacity: 1;
  }
  28% {
    opacity: 0;
  }
}
@keyframes monster-swing {
  0%,
  85%,
  100% {
    opacity: 0;
  }
  28% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-attacking,
  .is-attacking img {
    animation: none;
  }
}
</style>
