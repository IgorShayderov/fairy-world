<template>
  <div class="skill-bar" aria-label="Combat skills">
    <span v-for="skill in skills.abilities" :key="skill.id" class="skill-wrap" tabindex="0" :aria-label="skill.name">
      <button
        type="button"
        class="skill-icon"
        :class="`skill-${skill.effect}`"
        :aria-label="skill.name"
        :disabled="disabled || !!skill.unavailable"
        @click="$emit('cast', skill.id)"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" opacity=".25" stroke-width="1" />
          <path :d="icons[skill.effect ?? 'slash']" />
        </svg>
        <small v-if="skill.remainingCooldown" class="cooldown">{{ skill.remainingCooldown }}</small
        ><small v-else class="mana-cost">{{ skill.manaCost }}</small>
      </button>
      <QTooltip anchor="top middle" self="bottom middle" class="skill-tooltip"
        ><strong>{{ skill.name }}</strong>
        <div>{{ skill.description }}</div>
        <div>
          {{ skill.manaCost }} mana ·
          {{ skill.remainingCooldown ? `${skill.remainingCooldown} turns remaining` : 'Ready' }}
        </div>
        <div v-if="skill.unavailable">{{ skill.unavailable }}</div></QTooltip
      >
    </span>
  </div>
</template>
<script setup lang="ts">
import { QTooltip } from 'quasar';

import type { BattleSkills, SkillEffect } from '@/modules/Skills/api';
defineProps<{ skills: BattleSkills; disabled: boolean }>();
defineEmits<{ cast: [id: string] }>();
const icons: Record<SkillEffect, string> = {
  empower: 'M24 5 29 19 43 24 29 29 24 43 19 29 5 24 19 19Z M24 16V32 M16 24H32',
  'frost-arrow': 'M8 40 38 10 M28 10H38V20 M10 30V38H18 M15 9V25 M8 13 22 21 M8 21 22 13 M12 9 15 12 18 9',
  poison:
    'M8 40 38 10 M28 10H38V20 M8 32V40H16 M15 8V16L9 26Q7 32 15 32H25Q32 32 29 26L23 16V8 M13 8H25 M12 23H26 M17 26H18 M23 29H24',
  slash: 'M14 35 34 10 37 8 36 15 17 37 M12 29 22 37 M11 39 15 35 M9 12 Q14 6 23 7 M7 18 Q8 11 12 8',
  shockwave: 'M24 7 30 21 24 27 18 21Z M11 29 Q24 18 37 29 M8 35 Q24 23 40 35 M5 41 Q24 29 43 41',
  heal: 'M20 9H28V20H39V28H28V39H20V28H9V20H20Z M8 8 10 10 M38 38 40 40 M38 10 40 8',
  arrow: 'M10 38 36 12 M25 12H36V23 M10 29V38H19 M14 25V34H23 M10 13A16 16 0 0 1 35 37',
  pierce: 'M8 40 39 9 M27 9H39V21 M18 12 12 18 30 36 36 30 M7 31 14 38',
  volley: 'M8 37 19 12 M13 15 19 12 21 19 M19 39 29 9 M23 13 29 9 32 16 M30 39 40 17 M34 20 40 17 42 24',
  fire: 'M26 6C29 17 39 20 37 31C35 45 12 44 11 30C11 22 18 16 18 13C23 18 20 24 24 24C30 22 22 14 26 6Z M24 28C16 38 31 41 30 33',
  ice: 'M24 5V43 M8 14 40 34 M8 34 40 14 M19 9 24 14 29 9 M19 39 24 34 29 39 M8 20 15 18 15 11 M33 37 33 30 40 28 M8 28 15 30 15 37 M33 11 33 18 40 20',
  arcane:
    'M24 6 29 19 42 24 29 29 24 42 19 29 6 24 19 19Z M24 17 31 24 24 31 17 24Z M9 9 12 12 M36 36 39 39 M9 39 12 36 M36 12 39 9',
};
</script>
<style scoped>
.skill-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid #85734c;
  border-radius: 10px;
  background: #071a22ed;
}
.skill-wrap {
  display: inline-flex;
}
.skill-icon {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 9px;
  border: 1px solid currentColor;
  color: #f3c771;
  background: radial-gradient(circle at 50% 80%, #695122, #15252c 80%);
  box-shadow:
    inset 0 0 9px #0009,
    0 2px 5px #0008;
}
.skill-icon svg {
  width: 40px;
  height: 40px;
  margin: auto;
  filter: drop-shadow(0 0 3px currentColor);
}
.skill-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.3);
}
.skill-icon:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.skill-fire {
  color: #ff9c47;
  background: radial-gradient(circle at bottom, #79251c, #15252c);
}
.skill-ice,
.skill-frost-arrow {
  color: #9be9ff;
  background: radial-gradient(circle at bottom, #185c77, #15252c);
}
.skill-arcane {
  color: #d0a5ff;
  background: radial-gradient(circle at bottom, #55367a, #15252c);
}
.skill-heal {
  color: #b4f1b1;
  background: radial-gradient(circle at bottom, #28583b, #15252c);
}
.skill-arrow,
.skill-pierce,
.skill-volley {
  color: #a9e5cc;
  background: radial-gradient(circle at bottom, #295449, #15252c);
}
.skill-poison {
  color: #c0ef6a;
  background: radial-gradient(circle at bottom, #455b20, #15252c);
}
.mana-cost,
.cooldown {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: #0b263c;
  color: #ade7ff;
  border: 1px solid #6386a4;
  border-radius: 5px;
  font-size: 10px;
  padding: 0 3px;
}
.cooldown {
  inset: 12px;
  font-size: 18px;
  color: #ffe4a6;
  background: #11202be8;
}
</style>
