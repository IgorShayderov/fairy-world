<template>
  <div
    v-if="statuses?.slow || statuses?.armorBreak || statuses?.petrify || statuses?.empower"
    class="status-badges"
    :aria-label="label ?? 'Enemy status effects'"
  >
    <span v-if="statuses?.empower" title="Arcane Focus boosts the next two spell attacks"
      >✦ Spell damage +{{ statuses.empower.percent }}% · {{ statuses.empower.hits }} attacks</span
    >
    <span v-if="statuses?.slow" title="Reduced movement; expires after the affected character's turns"
      >❄ Slowed −{{ statuses.slow.reduction }} · {{ statuses.slow.turns }} turns</span
    >
    <span v-if="statuses?.armorBreak" title="Armor reduced until this many successful hits land"
      >⛨ Armor −{{ statuses.armorBreak.percent }}% · {{ statuses.armorBreak.hits }} hits</span
    >
    <span v-if="statuses?.petrify" title="Cannot move or attack">◆ Petrified · {{ statuses.petrify.turns }} turn</span>
  </div>
</template>
<script setup lang="ts">
import type { BattleCombatant } from '@/modules/Monsters/api';
defineProps<{ statuses?: BattleCombatant['statuses']; label?: string }>();
</script>
<style scoped>
.status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.status-badges span {
  font-size: 11px;
  color: #bce9f2;
  border: 1px solid #547b82;
  border-radius: 5px;
  background: #102a30;
  padding: 2px 5px;
}
</style>
