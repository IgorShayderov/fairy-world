<template>
  <main class="castle-page" :class="{ 'castle-page--estate': castle && activeTab === 'estate' }">
    <header class="castle-heading">
      <div class="castle-title-line">
        <h1>{{ castle?.name ?? 'A kingdom of your own' }}</h1>
        <span
          v-if="castle?.protectedUntil && Date.parse(castle.protectedUntil) > now"
          class="castle-protection"
          tabindex="0"
          @focus="hint = 'protection'"
          @blur="setHint('protection', false)"
        >
          <QIcon name="shield" /> Protected · {{ remainingTime(castle.protectedUntil, now) }}
          <QTooltip :model-value="hint === 'protection'" @update:model-value="setHint('protection', $event)">
            Protected from raids. Launching an attack ends your protection.
          </QTooltip>
        </span>
      </div>
      <div class="heading-actions">
        <button :disabled="pending || loading" @click="load()">Refresh</button>
      </div>
    </header>
    <ActionToasts :error="error" :success="message" />
    <p v-if="!state && loading" role="status">Opening your estate…</p>
    <section v-else-if="state && !castle" class="founding-panel">
      <CastleEstate :levels="emptyLevels" />
      <div>
        <p class="eyebrow">Unlocks at level {{ state.minLevel }}</p>
        <h2>Every legend needs a home.</h2>
        <p>
          Choose open land near Aurelia, Moonfall, Westmere or Larkhaven. Rivers, lakes, bogs, forests and mountains
          cannot support a castle.
        </p>
        <p>
          Your castle is hidden on the map. Other players can challenge it through the rankings. Locations and exact
          resource balances stay private.
        </p>
        <p class="gold">
          Foundation: {{ state.foundationGold.toLocaleString() }} gold · You have {{ state.gold.toLocaleString() }}
        </p>
        <p>
          Includes level 1 Crownkeep, Timberwright Lodge and Moonstone Quarry, plus 200 wood and 150 stone. Wood and
          stone production begins immediately.
        </p>
        <RouterLink v-if="state.eligible" class="primary" :to="{ path: '/', query: { castle: 'place' } }"
          >Choose a plot on the map</RouterLink
        >
        <p v-else class="locked">Reach level 25 to found your castle.</p>
      </div>
    </section>
    <template v-if="castle">
      <section class="resource-strip" aria-label="Castle resources">
        <div
          tabindex="0"
          :aria-label="`Wood: ${castle.wood} of ${castle.capacity}, +${castle.production.wood} per hour`"
          @focus="hint = 'wood'"
          @blur="setHint('wood', false)"
        >
          <span>Wood</span
          ><strong
            >{{ castle.wood.toLocaleString() }} <small>/ {{ castle.capacity.toLocaleString() }}</small></strong
          ><progress :value="castle.wood" :max="castle.capacity" aria-label="Wood storage" />
          <QTooltip :model-value="hint === 'wood'" @update:model-value="setHint('wood', $event)">
            +{{ castle.production.wood }}/hour · Production continues offline until storage is full.
          </QTooltip>
        </div>
        <div
          tabindex="0"
          :aria-label="`Stone: ${castle.stone} of ${castle.capacity}, +${castle.production.stone} per hour`"
          @focus="hint = 'stone'"
          @blur="setHint('stone', false)"
        >
          <span>Stone</span
          ><strong
            >{{ castle.stone.toLocaleString() }} <small>/ {{ castle.capacity.toLocaleString() }}</small></strong
          ><progress :value="castle.stone" :max="castle.capacity" aria-label="Stone storage" />
          <QTooltip :model-value="hint === 'stone'" @update:model-value="setHint('stone', $event)">
            +{{ castle.production.stone }}/hour · Production continues offline until storage is full.
          </QTooltip>
        </div>
        <div
          tabindex="0"
          :aria-label="`Army capacity: ${usedCapacity(castle)} of ${castle.armyCapacity}, including training and deployed units`"
          @focus="hint = 'army'"
          @blur="setHint('army', false)"
        >
          <span>Army capacity</span
          ><strong
            >{{ usedCapacity(castle) }} <small>/ {{ castle.armyCapacity }}</small></strong
          >
          <QTooltip :model-value="hint === 'army'" @update:model-value="setHint('army', $event)">
            Includes training and deployed units.
          </QTooltip>
        </div>
      </section>
      <nav class="castle-section-nav" aria-label="Castle sections">
        <button
          type="button"
          aria-label="Previous castle section"
          :title="`Previous: ${adjacentTab(-1).label}`"
          @click="changeSection(-1)"
        >
          <QIcon name="chevron_left" size="24px" />
        </button>
        <span class="castle-section-label" aria-live="polite">{{
          tabs.find((tab) => tab.key === activeTab)?.label
        }}</span>
        <button
          type="button"
          aria-label="Next castle section"
          :title="`Next: ${adjacentTab(1).label}`"
          @click="changeSection(1)"
        >
          <QIcon name="chevron_right" size="24px" />
        </button>
      </nav>
      <section v-if="activeTab === 'estate'" class="estate-layout">
        <div class="estate-art">
          <CastleEstate
            :levels="castle"
            :selected="selected"
            :construction="castle.construction"
            @select="selected = $event"
          />
          <p>Choose a building in your estate or from the list. Production continues offline until storage is full.</p>
          <div class="building-selector">
            <button
              v-for="building in castle.buildings"
              :key="building.key"
              :aria-pressed="selected === building.key"
              @click="selected = building.key"
            >
              {{ building.name }} <span>{{ building.level }}/10</span>
            </button>
          </div>
        </div>
        <aside v-if="selectedBuilding" class="castle-card building-detail">
          <p class="eyebrow">{{ selectedBuilding.level ? 'Improve your estate' : 'New construction' }}</p>
          <h2>{{ selectedBuilding.name }}</h2>
          <span class="level-badge">Level {{ selectedBuilding.level }} / 10</span>
          <p>{{ selectedBuilding.description }}</p>
          <div v-if="castle.construction" class="queue">
            <strong>{{ buildingName(castle.construction) }}</strong
            ><span>Building · {{ remainingTime(castle.constructionEndsAt, now) }}</span>
          </div>
          <template v-if="selectedBuilding.nextCost"
            ><h3>Level {{ selectedBuilding.level + 1 }}</h3>
            <p class="cost">{{ selectedBuilding.nextCost.wood }} wood · {{ selectedBuilding.nextCost.stone }} stone</p>
            <p>
              {{
                selectedBuilding.nextCost.seconds === 0
                  ? 'Instant construction · development mode'
                  : `${duration(selectedBuilding.nextCost.seconds)} construction time`
              }}
            </p>
            <button
              class="primary"
              :disabled="pending || !!upgradeReason"
              @click="
                run(
                  () => castlesApi.upgrade(selected),
                  selectedBuilding.nextCost.seconds === 0 ? 'Construction completed.' : 'Construction started.'
                )
              "
            >
              {{ selectedBuilding.level ? 'Upgrade building' : 'Construct building' }}
            </button>
            <p v-if="upgradeReason" class="hint">{{ upgradeReason }}</p>
          </template>
          <p v-else class="gold">Fully upgraded</p>
          <section v-if="selected === 'gemMine'" class="gem-mining">
            <h3>Gem expeditions</h3>
            <p>
              Find one random damage, defense or health gem. Higher mine levels produce stronger gems. These are
              equipment gems, not gem currency.
            </p>
            <template v-if="castle.gemMine > 0">
              <p v-if="castle.miningEndsAt">
                {{
                  Date.parse(castle.miningEndsAt) <= now
                    ? 'Your gem is ready.'
                    : remainingTime(castle.miningEndsAt, now)
                }}
              </p>
              <p v-else>
                {{ castle.miningCost.wood }} wood · {{ castle.miningCost.stone }} stone ·
                {{ duration(castle.miningCost.seconds) }}
              </p>
              <button
                v-if="castle.miningEndsAt"
                :disabled="pending || Date.parse(castle.miningEndsAt) > now"
                @click="run(() => castlesApi.collectGem(), 'Gem collected. Visit the Blacksmith to insert it.')"
              >
                Collect gem
              </button>
              <button v-else :disabled="pending" @click="run(() => castlesApi.mine(), 'Mining expedition started.')">
                Start mining expedition
              </button>
            </template>
            <h3>Gem storage ({{ castle.equipmentGems?.length ?? 0 }}/100)</h3>
            <p v-if="!castle.equipmentGems?.length">No equipment gems yet.</p>
            <ul>
              <li v-for="gem in castle.equipmentGems" :key="gem.id">
                ◆ +{{ gem.value }} {{ gem.type.toLowerCase() }} · mine level {{ gem.mineLevel }}
              </li>
            </ul>
            <p>Visit the Blacksmith to add sockets and insert gems into equipment.</p>
          </section>
        </aside>
      </section>
      <section v-else-if="activeTab === 'army'">
        <div v-if="castle.training" class="queue">
          <strong>Training {{ castle.trainingCount }} {{ unitName(castle.training) }}</strong
          ><span>{{ remainingTime(castle.trainingEndsAt, now) }}</span>
        </div>
        <p class="section-intro">
          Available army strength: <strong>{{ castle.armyPower }}</strong> · Castle defense:
          <strong>{{ castle.defensePower }}</strong> · Forge bonus: +{{ castle.forge * 10 }}%. Units at home defend your
          keep. Deployed units leave your castle less protected.
        </p>
        <div class="unit-grid">
          <article v-for="unit in castle.units" :key="unit.key" class="castle-card">
            <span class="unit-emblem" aria-hidden="true">{{
              unit.key === 'sentinels' ? '♜' : unit.key === 'rangers' ? '➶' : '✦'
            }}</span>
            <h2>{{ unit.name }}</h2>
            <p>{{ unit.description }}</p>
            <p class="gold">{{ unit.count }} ready · {{ unit.power }} base strength each</p>
            <p>{{ unit.wood }} wood + {{ unit.stone }} stone · {{ duration(unit.seconds) }} per unit</p>
            <label
              >Units to train<input v-model.number="trainingCounts[unit.key]" type="number" min="1" max="100" step="1"
            /></label>
            <p>Total: {{ unit.wood * validCount(unit.key) }} wood · {{ unit.stone * validCount(unit.key) }} stone</p>
            <button
              class="primary"
              :disabled="pending || !!trainingReason(unit.key)"
              @click="run(() => castlesApi.train(unit.key, trainingCounts[unit.key]), 'Training started.')"
            >
              Train {{ unit.name }}
            </button>
            <p class="hint">{{ trainingReason(unit.key) }}</p>
          </article>
        </div>
      </section>
      <section v-else-if="activeTab === 'raids'">
        <p class="section-intro">
          Challenge other players through the castle rankings. Raid castles within 2 keep levels of your own to take up
          to 10% of their stored wood and stone. Your hero stays where they are.
        </p>
        <div v-if="castle.raidTarget" class="queue">
          <strong>Your army is on a castle raid</strong
          ><span>Returns in {{ remainingTime(castle.raidEndsAt, now) }}</span>
        </div>
        <div v-else-if="castle.raidCooldownUntil && Date.parse(castle.raidCooldownUntil) > now" class="queue">
          Army resting · {{ remainingTime(castle.raidCooldownUntil, now) }}
        </div>
        <div class="raid-army castle-card">
          <h2>Choose your expedition</h2>
          <div class="army-inputs">
            <label v-for="unit in castle.units" :key="unit.key"
              >{{ unit.name }} ({{ unit.count }} ready)<input
                v-model.number="army[unit.key]"
                type="number"
                min="0"
                :max="unit.count"
                step="1"
            /></label>
          </div>
          <p class="gold">Selected strength: {{ selectedPower(army, castle.forge) }}</p>
          <p>
            Victory requires strength at least equal to the garrison. Victories lose 10–40% of troops (rounded up);
            defeats lose 65%. Survivors return. There is a 30-minute rest after every raid.
          </p>
        </div>
        <article v-if="opponent" class="castle-card">
          <p class="eyebrow">{{ opponent.owner }} · Crownkeep {{ opponent.keep }}</p>
          <h2>{{ opponent.name }}</h2>
          <p>
            Current defense: <strong>{{ opponent.defense }}</strong>
          </p>
          <p class="gold">
            Possible loot: {{ opponent.wood }} wood · {{ opponent.stone }} stone · +{{ opponent.rating }} rating
          </p>
          <p>
            {{ duration(opponent.seconds) }} expedition. Defense and loot can change before arrival. Your available
            storage limits loot.
          </p>
          <p class="loss">Launching a raid ends your protection. Troops can be permanently lost.</p>
          <button :disabled="pending || !!raidReason(opponent)" @click="confirmRaid = opponent">Review raid</button>
          <p class="hint">{{ raidReason(opponent) }}</p>
        </article>
        <button class="primary" @click="activeTab = 'ranking'">Choose an opponent from rankings</button>
        <p class="hint">
          New castles receive 24 hours of protection. A defeated castle receives 2 hours. If your target becomes
          protected before arrival, your army returns unharmed. Buildings are never destroyed.
        </p>
      </section>
      <section v-else-if="activeTab === 'reports'" class="castle-card">
        <h2>Battle reports</h2>
        <p v-if="!castle.reports.length">No castle battles yet.</p>
        <article v-for="report in castle.reports" :key="report.id" class="raid-report">
          <div>
            <strong :class="report.victory ? 'gold' : 'loss'"
              >{{ report.kind === 'RETURN' ? 'Returned without battle' : report.victory ? 'Victory' : 'Defeat' }} ·
              {{ report.kind === 'DEFENSE' ? 'Defending against' : 'Expedition to' }} {{ report.target }}</strong
            ><small>{{ new Date(report.createdAt).toLocaleString() }}</small>
          </div>
          <p>
            {{ report.kind === 'DEFENSE' ? 'Resources lost' : 'Resources received' }}: {{ report.wood }} wood ·
            {{ report.stone }} stone
          </p>
          <p>
            Troops lost: {{ report.lostSentinels }} Oathguard, {{ report.lostRangers }} Rangers,
            {{ report.lostArcanists }} Arcanists.
          </p>
        </article>
      </section>
    </template>
    <section v-if="activeTab === 'ranking' || (state && !castle)" class="castle-card ranking-section">
      <div class="ranking-heading">
        <div>
          <p class="eyebrow">Hall of strongholds</p>
          <h2>Castle rankings</h2>
        </div>
        <small>Construction + raid victories</small>
      </div>
      <p v-if="!rankings.length" class="hint">No castles yet. Be the first to establish a domain.</p>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Castle</th>
              <th>Owner</th>
              <th>Keep</th>
              <th>Rating</th>
              <th>Victories</th>
              <th>Challenge</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in rankings" :key="entry.id" :class="{ 'own-castle': entry.isCurrent }">
              <td>{{ entry.rank }}</td>
              <td>{{ entry.name }}</td>
              <td>{{ entry.owner }}</td>
              <td>{{ entry.keep }}</td>
              <td>{{ entry.rating }}</td>
              <td>{{ entry.victories }}</td>
              <td>
                <span v-if="entry.isCurrent">Your castle</span
                ><span v-else-if="entry.protectedUntil && Date.parse(entry.protectedUntil) > now">Protected</span
                ><button v-else :disabled="!castle || pending" @click="scout(entry.id)">Scout castle</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">
        Founding grants 100 rating. Each completed building level grants 25 × its new level. Successful raids grant 20 +
        5 × the defender’s keep level.
      </p>
    </section>
    <QDialog
      :model-value="!!confirmRaid"
      @update:model-value="
        (value) => {
          if (!value) confirmRaid = null;
        }
      "
      ><div v-if="confirmRaid" class="castle-card castle-confirm" aria-labelledby="raid-title">
        <h2 id="raid-title">March on {{ confirmRaid.name }}?</h2>
        <p>{{ army.sentinels }} Oathguard · {{ army.rangers }} Rangers · {{ army.arcanists }} Arcanists</p>
        <p>
          Strength {{ castle ? selectedPower(army, castle.forge) : 0 }} versus current defense
          {{ confirmRaid.defense }}.
        </p>
        <p class="loss">
          {{
            castle && selectedPower(army, castle.forge) < confirmRaid.defense
              ? 'This army is currently too weak. Defeat costs 65% of each unit type.'
              : 'Even a victory costs troops. Losses are permanent.'
          }}
          Launching ends your castle’s protection.
        </p>
        <div class="heading-actions">
          <button autofocus :disabled="pending" @click="confirmRaid = null">Cancel</button
          ><button class="primary" :disabled="pending || !!raidReason(confirmRaid)" @click="launchRaid">
            Send army
          </button>
        </div>
      </div></QDialog
    >
  </main>
</template>
<script setup lang="ts">
import { QDialog, QIcon, QTooltip } from 'quasar';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import ActionToasts from '@/components/ActionToasts';
import {
  castlesApi,
  type CastleState,
  type CastleRanking,
  type BuildingKey,
  type UnitKey,
  type Army,
  type RaidTarget,
} from '@/modules/Castles/api';
import { remainingTime, selectedPower, usedCapacity } from '@/modules/Castles/presentation';

import CastleEstate from '@/modules/Castles/CastleEstate.vue';
import '@/modules/Castles/castles.css';

const state = ref<CastleState | null>(null),
  rankings = ref<CastleRanking[]>([]);
const castle = computed(() => state.value?.castle ?? null);
const emptyLevels = { keep: 0, lumberMill: 0, quarry: 0, storehouse: 0, barracks: 0, forge: 0 };
const tabs = [
  { key: 'estate', label: 'Estate' },
  { key: 'army', label: 'Army' },
  { key: 'raids', label: 'Raids' },
  { key: 'reports', label: 'Reports' },
  { key: 'ranking', label: 'Rankings' },
] as const;
const route = useRoute();
const activeTab = ref<string>(route.query.tab === 'ranking' ? 'ranking' : 'estate'),
  selected = ref<BuildingKey>('keep');
const adjacentTab = (direction: number) =>
  tabs[(tabs.findIndex((tab) => tab.key === activeTab.value) + direction + tabs.length) % tabs.length]!;
function changeSection(direction: number) {
  activeTab.value = adjacentTab(direction).key;
}
const hint = ref<string | null>(null);
function setHint(key: string, visible: boolean) {
  if (visible) hint.value = key;
  else if (hint.value === key) hint.value = null;
}
const pending = ref(false),
  loading = ref(false),
  error = ref(''),
  message = ref(''),
  now = ref(Date.now());
let offset = 0,
  loadVersion = 0,
  disposed = false,
  timer: ReturnType<typeof setInterval> | undefined,
  poll: ReturnType<typeof setInterval> | undefined;
const trainingCounts = ref<Army>({ sentinels: 1, rangers: 1, arcanists: 1 });
const army = ref<Army>({ sentinels: 0, rangers: 0, arcanists: 0 });
const confirmRaid = ref<RaidTarget | null>(null);
const opponent = ref<RaidTarget | null>(null);
const selectedBuilding = computed(() => castle.value?.buildings.find((b) => b.key === selected.value));
const buildingName = (key: BuildingKey) => castle.value?.buildings.find((b) => b.key === key)?.name;
const unitName = (key: UnitKey) => castle.value?.units.find((u) => u.key === key)?.name;
const duration = (seconds: number) => (seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} sec`);
const upgradeReason = computed(() => {
  const c = castle.value,
    b = selectedBuilding.value;
  if (!c || !b?.nextCost) return 'Maximum level reached.';
  if (c.construction) return 'Wait for the current construction to finish.';
  if (!b.unlocked) return `Requires Crownkeep level ${Math.max(b.requiredKeep || 1, b.level + 1)}.`;
  if (c.wood < b.nextCost.wood || c.stone < b.nextCost.stone) return 'Not enough wood or stone.';
  return '';
});
function validCount(key: UnitKey) {
  const count = trainingCounts.value[key];
  return Number.isInteger(count) && count > 0 && count <= 100 ? count : 0;
}
function trainingReason(key: UnitKey) {
  const c = castle.value,
    u = c?.units.find((u) => u.key === key),
    count = validCount(key);
  if (!c || !u) return '';
  if (c.barracks < u.barracks) return `Requires barracks level ${u.barracks}.`;
  if (c.training) return 'Wait for the current training order.';
  if (!count) return 'Choose 1–100 units.';
  if (usedCapacity(c) + count > c.armyCapacity) return 'Upgrade the barracks for more army capacity.';
  if (c.wood < u.wood * count || c.stone < u.stone * count) return 'Not enough wood or stone.';
  return '';
}
function raidReason(target: RaidTarget) {
  const c = castle.value;
  if (!c) return '';
  if (target.reason) return target.reason;
  if (c.raidTarget) return 'Wait for your army to return.';
  if (c.raidCooldownUntil && Date.parse(c.raidCooldownUntil) > now.value) return 'Your army is resting.';
  if (c.units.some((u) => !Number.isInteger(army.value[u.key]) || army.value[u.key] < 0 || army.value[u.key] > u.count))
    return 'Select only available units.';
  if (army.value.sentinels + army.value.rangers + army.value.arcanists < 1) return 'Choose units for this expedition.';
  return '';
}
async function load(force = false) {
  if ((loading.value && !force) || disposed) return;
  const version = ++loadVersion;
  loading.value = true;
  try {
    const [next, list] = await Promise.all([castlesApi.get(), castlesApi.leaderboard()]);
    if (disposed || version !== loadVersion) return;
    state.value = next;
    rankings.value = list;
    offset = Date.parse(next.serverTime) - Date.now();
    now.value = Date.now() + offset;
    error.value = '';
  } catch (reason) {
    if (!disposed && version === loadVersion)
      error.value = reason instanceof Error ? reason.message : 'Could not load your castle.';
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}
async function run(action: () => Promise<unknown>, success: string) {
  if (pending.value) return;
  pending.value = true;
  error.value = '';
  message.value = '';
  try {
    await action();
    message.value = success;
    // A poll started before this mutation must not overwrite its refreshed state.
    await load(true);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Action failed. Please try again.';
  } finally {
    pending.value = false;
  }
}
async function launchRaid() {
  const target = confirmRaid.value;
  if (!target) return;
  await run(() => castlesApi.raid(target.id, army.value), 'Your expedition has departed.');
  confirmRaid.value = null;
}
async function scout(id: string) {
  if (pending.value) return;
  pending.value = true;
  error.value = '';
  try {
    opponent.value = await castlesApi.preview(id);
    activeTab.value = 'raids';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not scout this castle.';
  } finally {
    pending.value = false;
  }
}
onMounted(() => {
  void load();
  timer = setInterval(() => {
    now.value = Date.now() + offset;
  }, 1000);
  poll = setInterval(() => {
    if (!document.hidden && !pending.value) void load();
  }, 15000);
});
onUnmounted(() => {
  disposed = true;
  clearInterval(timer);
  clearInterval(poll);
});
</script>
