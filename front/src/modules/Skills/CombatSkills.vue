<template>
  <section class="combat-skills" aria-label="Combat skills">
    <header>
      <strong><QIcon name="auto_awesome" /> Skills</strong
      ><span><QIcon name="water_drop" /> {{ skills.mana }} / {{ skills.maxMana }} mana</span><small>+3 per turn</small>
    </header>
    <div class="abilities">
      <button
        v-for="skill in skills.abilities"
        :key="skill.id"
        :disabled="disabled || !!skill.unavailable"
        :title="skill.unavailable || skill.description"
        @click="$emit('cast', skill.id)"
      >
        <QIcon :name="skill.icon" size="25px" /><span
          ><strong>{{ skill.name }}</strong
          ><small
            >{{ skill.manaCost }} mana ·
            {{ skill.remainingCooldown ? `${skill.remainingCooldown} turn cooldown` : `Rank ${skill.rank}` }}</small
          ><small v-if="skill.unavailable" class="reason">{{ skill.unavailable }}</small></span
        >
      </button>
      <p v-if="!skills.abilities.length">
        No active skills learned. Learn a combat ability from your class tree outside battle; passive skills apply
        automatically.
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { QIcon } from 'quasar';

import type { BattleSkills } from './api';

defineProps<{ skills: BattleSkills; disabled: boolean }>();
defineEmits<{ cast: [skillId: string] }>();
</script>
<style scoped>
.combat-skills {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid #aa8ce044;
  background: #0a1d2d;
  color: #cce3f6;
}
header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  margin-bottom: 10px;
}
header strong {
  color: #dfccff;
}
header small {
  color: #8ba4b7;
}
.abilities {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 3px;
}
.abilities button {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 155px;
  flex: 1;
  border: 1px solid #ac8de168;
  background: #7d55bf12;
  border-radius: 10px;
  padding: 9px 12px;
  text-align: left;
  color: #ddccff;
  cursor: pointer;
}
.abilities button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.abilities button:hover:not(:disabled) {
  background: #7d55bf40;
}
.abilities strong,
.abilities small {
  display: block;
}
.abilities strong {
  font-size: 13px;
}
.abilities small {
  font-size: 10px;
  color: #9fcbe7;
  margin-top: 3px;
}
.abilities .reason {
  color: #e6bf99;
}
.abilities p {
  font-size: 12px;
  color: #95abb8;
  margin: 0;
}
</style>
