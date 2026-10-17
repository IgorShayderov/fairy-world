<template>
  <main class="skills-page" :style="{ '--accent': selectedClass.color }">
    <div class="skills-content">
      <header class="skills-heading">
        <div>
          <p class="eyebrow">CHARACTER PROGRESSION</p>
          <h1>Choose your path</h1>
          <p>One skill point for every level. Shape how you fight.</p>
        </div>
        <div v-if="tree" class="points" aria-live="polite">
          <strong>{{ tree.points.available }}</strong
          ><span>POINTS AVAILABLE</span><small>{{ tree.points.spent }} spent · Level {{ tree.level }}</small>
        </div>
      </header>
      <p v-if="error" role="alert" class="error">{{ error }} <button @click="load">Retry</button></p>
      <p v-if="!tree && !error" role="status">Loading skill trees…</p>
      <template v-if="tree">
        <nav class="class-tabs" aria-label="Class skill trees">
          <button
            v-for="item in classes"
            :key="item.id"
            :class="{ selected: selected === item.id }"
            :aria-pressed="selected === item.id"
            :style="{ '--class-color': item.color }"
            @click="selected = item.id"
          >
            <QIcon :name="item.icon" size="30px" /><span
              ><strong>{{ item.name }}</strong
              ><small>{{ item.role }}</small></span
            ><span v-if="tree.class === item.id" class="chosen">YOUR CLASS</span>
          </button>
        </nav>
        <section class="tree-panel">
          <header class="tree-intro">
            <div>
              <h2>{{ selectedClass.name }}</h2>
              <p>{{ selectedClass.description }}</p>
            </div>
            <button
              v-if="tree.class !== selected"
              class="primary"
              :disabled="busy || tree.locked || (!!tree.class && tree.gems < tree.resetCost)"
              @click="choose"
            >
              {{ tree.class ? `Switch class · ${tree.resetCost} gems` : 'Choose this class' }}
            </button>
            <button
              v-else
              class="reset"
              :disabled="busy || tree.locked || tree.points.spent === 0 || tree.gems < tree.resetCost"
              @click="choose"
            >
              <QIcon name="diamond" /> Reset all skills · {{ tree.resetCost }} gems
            </button>
          </header>
          <p class="mb-4 text-sm text-sky-200">
            Your balance: {{ tree.gems }} gems. Resetting returns every spent point and costs {{ tree.resetCost }} gems.
          </p>
          <p v-if="tree.locked" class="lock-notice">
            <QIcon name="lock" /> Finish or leave your current battle or dungeon to change skills.
          </p>
          <div class="tree-legend"><span>PASSIVE MASTERY</span><span>COMBAT ABILITIES</span></div>
          <div class="skill-tree">
            <article
              v-for="skill in visibleSkills"
              :key="skill.id"
              class="skill-node"
              :class="{ learned: rank(skill) > 0, gated: !!requirement(skill) }"
            >
              <div
                v-if="skill.prerequisite"
                class="branch-line"
                :class="{ unlocked: rankById(skill.prerequisite) >= (skill.prerequisiteRank ?? 1) }"
                aria-hidden="true"
              />
              <header>
                <div class="skill-icon"><QIcon :name="skill.icon" size="27px" /></div>
                <div>
                  <small>{{ skill.effect ? 'ACTIVE' : 'PASSIVE' }} · TIER {{ skill.tier }}</small>
                  <h3>{{ skill.name }}</h3>
                </div>
                <span class="rank"
                  >{{ rank(skill) }}<small>/{{ skill.maxRank }}</small></span
                >
              </header>
              <p class="skill-description">{{ skill.description }}</p>
              <div class="skill-meta">
                <template v-if="skill.effect"
                  ><span><QIcon name="water_drop" /> {{ skill.manaCost }} mana</span
                  ><span><QIcon name="hourglass_bottom" /> {{ skill.cooldown }} turn cooldown</span
                  ><span v-if="skill.range">Range {{ skill.range }}</span></template
                ><span v-else>Always active</span>
              </div>
              <div
                class="rank-track"
                role="progressbar"
                :aria-valuenow="rank(skill)"
                :aria-valuemax="skill.maxRank"
                :aria-label="`${skill.name} rank`"
              >
                <div :style="{ width: `${(rank(skill) / skill.maxRank) * 100}%` }" />
              </div>
              <footer>
                <span>{{
                  requirement(skill) || (rank(skill) === skill.maxRank ? 'Mastered' : '1 point per rank')
                }}</span
                ><button
                  :disabled="
                    busy ||
                    tree.locked ||
                    tree.class !== selected ||
                    !!requirement(skill) ||
                    rank(skill) >= skill.maxRank ||
                    tree.points.available < 1
                  "
                  :aria-label="`Upgrade ${skill.name}`"
                  @click="upgrade(skill)"
                >
                  <QIcon name="add" /> {{ rank(skill) ? 'Improve' : 'Learn' }}
                </button>
              </footer>
            </article>
          </div>
          <p class="tree-help">
            Passives apply in all combat modes. Use active skills in encounters and dungeons. Mana restores by 3 after
            each turn. Resetting or switching class costs {{ tree.resetCost }} gems and returns all spent points;
            neither is allowed during a battle or dungeon.
          </p>
        </section>
      </template>
    </div>
    <QDialog v-model="confirmReset">
      <QCard class="bg-[#102b35] p-6 text-white" style="max-width: 420px">
        <h2 class="font-serif text-2xl text-[#ffe7ac]">
          {{ tree?.class === selected ? 'Reset skills?' : `Become a ${selectedClass.name}?` }}
        </h2>
        <p class="my-4">
          Spend {{ tree?.resetCost }} gems to return all {{ tree?.points.spent }} allocated points. Your equipment and
          level will not change.
        </p>
        <p class="mb-4 text-sky-200">Balance after reset: {{ (tree?.gems ?? 0) - (tree?.resetCost ?? 500) }} gems</p>
        <QCardActions align="right"
          ><QBtn v-close-popup flat label="Cancel" /><QBtn
            :label="`Pay ${tree?.resetCost ?? 500} gems`"
            :disable="!tree || tree.gems < tree.resetCost"
            color="primary"
            :loading="busy"
            @click="applyClass"
        /></QCardActions>
      </QCard>
    </QDialog>
  </main>
</template>

<script setup lang="ts">
import { QIcon, QDialog, QCard, QCardActions, QBtn } from 'quasar';
import { computed, onMounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { skillsApi, type PlayerClass, type SkillDefinition, type SkillTree } from '@/modules/Skills/api';

const classes = [
  {
    id: 'WARRIOR' as const,
    name: 'Warrior',
    role: 'Steel & endurance',
    icon: 'shield',
    color: '#eab76a',
    description: 'Stand your ground. Break the enemy with heavy melee strikes and unyielding defenses.',
  },
  {
    id: 'SCOUT' as const,
    name: 'Scout',
    role: 'Precision & evasion',
    icon: 'my_location',
    color: '#6ad5ad',
    description: 'Keep your distance. Master bows and crossbows, evade danger, and pierce enemy armor.',
  },
  {
    id: 'MAGE' as const,
    name: 'Mage',
    role: 'Elements & arcana',
    icon: 'auto_awesome',
    color: '#bc9eff',
    description: 'Turn Wisdom into power. Hurl fire, slow enemies with frost, and unleash arcane energy.',
  },
];
const tree = ref<SkillTree>();
const selected = ref<PlayerClass>('WARRIOR');
const selectedClass = computed(() => classes.find((entry) => entry.id === selected.value)!);
const visibleSkills = computed(() => tree.value?.catalog.filter((skill) => skill.class === selected.value) ?? []);
const busy = ref(false);
const error = ref('');
const confirmReset = ref(false);
const user = useCurrentUserStore();
const rankById = (id: string) => tree.value?.ranks[id] ?? 0;
const rank = (skill: SkillDefinition) => rankById(skill.id);
function requirement(skill: SkillDefinition) {
  if ((tree.value?.level ?? 1) < skill.requiredLevel) return `Requires level ${skill.requiredLevel}`;
  if (skill.prerequisite && rankById(skill.prerequisite) < (skill.prerequisiteRank ?? 1)) {
    const parent = tree.value?.catalog.find((entry) => entry.id === skill.prerequisite);
    return `${parent?.name ?? 'Previous skill'} rank ${skill.prerequisiteRank}`;
  }
  return '';
}
async function load() {
  error.value = '';
  try {
    tree.value = await skillsApi.get();
    selected.value = tree.value.class ?? 'WARRIOR';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to load skills';
  }
}
async function mutate(operation: () => Promise<SkillTree>) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    tree.value = await operation();
    await user.fetchCurrentUser(true);
    confirmReset.value = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to update skills';
  } finally {
    busy.value = false;
  }
}
function choose() {
  if (tree.value?.class) confirmReset.value = true;
  else void applyClass();
}
const applyClass = () =>
  mutate(() => (tree.value?.class === selected.value ? skillsApi.reset() : skillsApi.choose(selected.value)));
const upgrade = (skill: SkillDefinition) => mutate(() => skillsApi.upgrade(skill.id));
onMounted(load);
</script>

<style scoped>
.skills-page {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: scroll;
  padding: clamp(18px, 3vw, 42px);
  background: radial-gradient(ellipse at 40% 0, #193237, #071821 65%);
  color: #b3c7c7;
}
.skills-content {
  max-width: 1150px;
  margin: auto;
}
.skills-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 28px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.24em;
  color: #e8c773;
  font-weight: 700;
}
h1 {
  color: #fff0bf;
  font:
    42px Georgia,
    serif;
  margin: 8px 0 12px;
}
h2 {
  color: var(--accent);
  font:
    30px Georgia,
    serif;
  margin: 0 0 8px;
}
.points {
  min-width: 155px;
  display: grid;
  text-align: center;
  padding: 15px 24px;
  border: 1px solid #d9bb6555;
  border-radius: 16px;
  background: #081b24;
}
.points strong {
  font-size: 38px;
  line-height: 1.1;
  color: #f0d287;
}
.points span {
  font-size: 10px;
  letter-spacing: 0.14em;
  margin: 8px 0;
}
.points small {
  font-size: 12px;
}
.class-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.class-tabs button {
  text-align: left;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 20px;
  border: 1px solid #33515b;
  border-radius: 14px;
  background: #0b222c;
  color: #8fa8af;
  position: relative;
  min-height: 100px;
}
.class-tabs button.selected {
  border-color: var(--class-color);
  color: var(--class-color);
  background: color-mix(in srgb, var(--class-color) 10%, #0b222c);
  box-shadow: inset 0 2px var(--class-color);
}
.class-tabs strong,
.class-tabs small {
  display: block;
}
.class-tabs strong {
  font:
    23px Georgia,
    serif;
}
.class-tabs small {
  font-size: 12px;
  margin-top: 5px;
}
.chosen {
  position: absolute;
  top: 7px;
  right: 10px;
  font-size: 8px;
  letter-spacing: 0.1em;
}
.tree-panel {
  border: 1px solid #33515b;
  border-radius: 18px;
  background: #0a2029df;
  padding: clamp(16px, 3vw, 32px);
}
.tree-intro {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.tree-intro p {
  max-width: 640px;
  line-height: 1.6;
}
.primary,
.reset {
  flex-shrink: 0;
  border: 1px solid var(--accent);
  border-radius: 9px;
  padding: 11px 16px;
  color: var(--accent);
}
.primary {
  color: #0c2029;
  background: var(--accent);
  font-weight: 700;
}
.tree-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.22em;
  margin-bottom: 14px;
  color: var(--accent);
}
.skill-tree {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 36px;
  row-gap: 34px;
}
.skill-node {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #39515a;
  border-radius: 12px;
  padding: 20px;
  background: #0b1b25;
}
.skill-node.learned {
  border-color: color-mix(in srgb, var(--accent) 65%, #263842);
  background: linear-gradient(125deg, color-mix(in srgb, var(--accent) 8%, #0b1b25), #0b1b25);
}
.skill-node header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.skill-icon {
  width: 48px;
  height: 48px;
  border: 1px solid #48616b;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--accent);
  background: #142e37;
  flex-shrink: 0;
}
.skill-node header small {
  font-size: 9px;
  letter-spacing: 0.12em;
}
.skill-node h3 {
  color: #f5e5bf;
  font:
    21px Georgia,
    serif;
  margin-top: 4px;
}
.rank {
  margin-left: auto;
  color: var(--accent);
  font-size: 22px;
  white-space: nowrap;
}
.rank small {
  font-size: 13px !important;
  letter-spacing: 0 !important;
  color: #80999e;
}
.skill-description {
  font-size: 13px;
  line-height: 1.6;
  margin: 18px 0;
  flex: 1;
  min-height: 42px;
}
.skill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: #a0b6cd;
  min-height: 20px;
}
.rank-track {
  height: 4px;
  background: #20343e;
  margin: 16px 0;
  border-radius: 3px;
  overflow: hidden;
}
.rank-track div {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}
.skill-node footer {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
.skill-node footer span {
  font-size: 11px;
}
.skill-node footer button {
  border: 1px solid var(--accent);
  padding: 7px 12px;
  border-radius: 7px;
  color: var(--accent);
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
}
.branch-line {
  position: absolute;
  width: 2px;
  height: 34px;
  top: -35px;
  left: 50%;
  background: #39515a;
}
.branch-line::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 7px;
  background: inherit;
  top: 12px;
  left: -2.5px;
  transform: rotate(45deg);
}
.branch-line.unlocked {
  background: var(--accent);
  box-shadow: 0 0 7px var(--accent);
}
.tree-help {
  font-size: 12px;
  line-height: 1.7;
  padding-top: 26px;
  margin-top: 26px;
  border-top: 1px solid #30444b;
  color: #8aa5ab;
}
.lock-notice,
.error {
  background: #402c22;
  border: 1px solid #a97642;
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 22px;
}
.error {
  color: #ffb6b6;
}
.error button {
  text-decoration: underline;
  margin-left: 10px;
}
button {
  cursor: pointer;
  transition: filter 0.15s;
}
button:hover:not(:disabled) {
  filter: brightness(1.2);
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}
@media (max-width: 650px) {
  h1 {
    font-size: 30px;
  }
  .skills-heading {
    align-items: flex-start;
  }
  .points {
    min-width: 100px;
    padding: 12px;
  }
  .points span {
    font-size: 8px;
  }
  .points strong {
    font-size: 30px;
  }
  .class-tabs {
    gap: 7px;
  }
  .class-tabs button {
    padding: 22px 8px 12px;
    flex-direction: column;
    gap: 7px;
    text-align: center;
  }
  .class-tabs strong {
    font-size: 18px;
  }
  .class-tabs small {
    display: none;
  }
  .chosen {
    left: 0;
    right: 0;
  }
  .tree-intro {
    flex-wrap: wrap;
  }
  .skill-tree {
    column-gap: 12px;
  }
  .skill-node {
    padding: 12px;
  }
  .skill-node header {
    flex-wrap: wrap;
    gap: 7px;
  }
  .skill-node h3 {
    font-size: 17px;
  }
  .rank {
    font-size: 17px;
  }
  .skill-icon {
    width: 35px;
    height: 35px;
  }
  .skill-node footer {
    flex-direction: column;
    align-items: stretch;
  }
  .skill-node footer span {
    min-height: 30px;
  }
  .tree-legend {
    font-size: 8px;
    letter-spacing: 0.1em;
  }
}
</style>
