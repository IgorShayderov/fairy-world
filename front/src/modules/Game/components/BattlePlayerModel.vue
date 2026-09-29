<template>
  <div
    class="battle-player-model"
    :class="`battle-player-model--${loadout.handMode.toLowerCase().replace('_', '-')}`"
    role="img"
    :aria-label="ariaLabel"
  >
    <img
      class="battle-player-model__body"
      :class="{ 'battle-player-model__body--greatsword': usesGreatswordPose }"
      :src="usesGreatswordPose ? '/images/battle/player-knight-greatsword.png' : '/images/battle/player-knight-base.png'"
      alt=""
    />
    <template v-if="usesGreatswordPose">
      <img class="battle-player-model__pose battle-player-model__pose--windup" src="/images/battle/player-knight-greatsword-windup.png" alt="" />
      <img class="battle-player-model__pose battle-player-model__pose--strike" src="/images/battle/player-knight-greatsword-strike.png" alt="" />
    </template>

    <span
      v-if="loadout.primaryIcon && !usesGreatswordPose"
      class="battle-player-model__weapon-rig battle-player-model__primary"
      :class="`battle-player-model__weapon--${loadout.primaryWeapon.toLowerCase()}`"
    >
      <img :src="loadout.primaryIcon" alt="" />
    </span>
    <span
      v-if="loadout.handMode === 'DUAL' && loadout.secondaryIcon"
      class="battle-player-model__weapon-rig battle-player-model__secondary"
      :class="`battle-player-model__weapon--${loadout.secondaryWeapon?.toLowerCase()}`"
    >
      <img :src="loadout.secondaryIcon" alt="" />
    </span>
    <img
      v-if="loadout.handMode === 'WEAPON_SHIELD' && loadout.shieldIcon"
      class="battle-player-model__gear battle-player-model__shield"
      :src="loadout.shieldIcon"
      alt=""
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { InventoryEntry } from '@/modules/Inventory/types';

import { getBattlePlayerLoadout } from '@/modules/Game/battlePlayerLoadout';

const props = defineProps<{ equippedItems?: readonly InventoryEntry[] }>();
const loadout = computed(() => getBattlePlayerLoadout(props.equippedItems));
const usesGreatswordPose = computed(() =>
  loadout.value.handMode === 'TWO_HANDED' && loadout.value.primaryWeapon === 'SWORD',
);
const ariaLabel = computed(() => `Player character: ${loadout.value.handMode.toLowerCase().replace('_', ' ')}`);
</script>

<style scoped>
.battle-player-model {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 50% 100%;
}
.battle-player-model__body,
.battle-player-model__pose,
.battle-player-model__gear,
.battle-player-model__weapon-rig,
.battle-player-model__weapon-rig img {
  position: absolute;
  pointer-events: none;
  user-select: none;
}
.battle-player-model__body {
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 14px 8px rgb(0 0 0 / 38%));
}
.battle-player-model__pose {
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  filter: drop-shadow(0 14px 8px rgb(0 0 0 / 38%));
}
.battle-player-model__gear {
  object-fit: contain;
  filter: drop-shadow(0 5px 3px rgb(0 0 0 / 55%));
}
.battle-player-model__weapon-rig {
  z-index: 1;
  width: 34%;
  aspect-ratio: 1;
  transform-origin: 0 0;
}
.battle-player-model__weapon-rig img {
  top: -90%;
  left: -8%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 8% 90%;
  filter: drop-shadow(0 5px 3px rgb(0 0 0 / 55%));
}
.battle-player-model__primary {
  top: 46%;
  left: 29%;
}
.battle-player-model__primary img {
  transform: rotate(-67deg);
}
.battle-player-model__weapon--axe img {
  transform: rotate(-58deg);
}
.battle-player-model__weapon--dagger {
  width: 27%;
}
.battle-player-model__weapon--dagger img {
  transform: rotate(-73deg);
}
.battle-player-model__shield {
  top: 28%;
  right: 5%;
  z-index: 4;
  width: 31%;
  height: 34%;
  transform: rotate(-11deg);
}
.battle-player-model__secondary {
  top: 34%;
  left: 79%;
  width: 30%;
}
.battle-player-model__secondary img {
  transform: rotate(2deg);
}
.battle-player-model--two-handed .battle-player-model__primary {
  width: 41%;
}
.battle-player-model--two-handed .battle-player-model__primary img {
  transform: rotate(-61deg);
}
.battle-player-model--two-handed .battle-player-model__weapon--axe img {
  transform: rotate(-54deg);
}
.battle-player-model.unit-attacking .battle-player-model__primary {
  animation: primary-weapon-swing 0.55s cubic-bezier(0.36, 0, 0.24, 1);
}
.battle-player-model.unit-attacking .battle-player-model__secondary {
  animation: secondary-weapon-swing 0.55s cubic-bezier(0.36, 0, 0.24, 1);
}
.battle-player-model.unit-attacking .battle-player-model__body {
  animation: knight-attack-lean 0.55s ease-in-out;
}
.battle-player-model__body--greatsword {
  transform-origin: 50% 88%;
}
.battle-player-model.unit-attacking .battle-player-model__body--greatsword {
  animation: greatsword-guard 0.95s steps(1, end);
}
.battle-player-model.unit-attacking .battle-player-model__pose--windup {
  animation: greatsword-windup 0.95s linear;
}
.battle-player-model.unit-attacking .battle-player-model__pose--strike {
  animation: greatsword-follow-through 0.95s linear;
}
@keyframes greatsword-guard {
  0%, 90%, 100% { opacity: 1; }
  8% { opacity: 0; }
}
@keyframes greatsword-windup {
  0%, 7.99% { opacity: 0; transform: translateX(0); }
  8% { opacity: 1; transform: translateX(0); }
  30% { opacity: 1; transform: translateX(-4%); }
  35.99% { opacity: 1; transform: translateX(1%); }
  36%, 100% { opacity: 0; }
}
@keyframes greatsword-follow-through {
  0%, 35.99% { opacity: 0; transform: translateX(1%); }
  36% { opacity: 1; transform: translateX(1%); }
  50% { opacity: 1; transform: translateX(12%); }
  68% { opacity: 1; transform: translateX(12%); }
  89.99% { opacity: 1; transform: translateX(0); }
  90%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .battle-player-model.unit-attacking .battle-player-model__body,
  .battle-player-model.unit-attacking .battle-player-model__pose,
  .battle-player-model.unit-attacking .battle-player-model__weapon-rig {
    animation: none;
  }
}
@keyframes primary-weapon-swing {
  0%, 100% { transform: rotate(0); }
  24% { transform: rotate(-28deg); }
  68% { transform: rotate(82deg); }
}
@keyframes secondary-weapon-swing {
  0%, 100% { transform: rotate(0); }
  28% { transform: rotate(22deg); }
  70% { transform: rotate(-54deg); }
}
@keyframes knight-attack-lean {
  0%, 100% { transform: rotate(0); }
  35% { transform: rotate(-2deg); }
  68% { transform: rotate(3deg) translateX(2%); }
}
</style>
