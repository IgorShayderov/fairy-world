<template>
  <div class="castle-map-layer">
    <ActionToasts :error="error" />
    <svg v-if="placing && state" class="castle-ranges" aria-hidden="true">
      <circle
        v-for="city in state.placement.cities"
        :key="city.name"
        :cx="city.x * camera.scale + camera.x"
        :cy="city.y * camera.scale + camera.y"
        :r="state.placement.radius * camera.scale"
        fill="#91d5b416"
        stroke="#95dfc2"
        stroke-width="2"
        stroke-dasharray="9 7"
      />
    </svg>
    <button
      v-if="state?.castle"
      class="private-castle-marker"
      :style="{ ...pointStyle(state.castle), '--marker-scale': camera.scale }"
      :aria-label="`Open ${state.castle.name}, your castle`"
      @pointerdown.stop
      @click="router.push('/castle')"
    >
      <svg width="76" height="80" viewBox="0 0 64 64" aria-hidden="true">
        <path d="m5 50 27-10 27 10-27 12Z" fill="#18343e" />
        <path d="M10 48V23h9v-6h26v6h9v25L32 57Z" fill="#819a90" stroke="#e1c581" stroke-width="2" />
        <path d="M23 18V7h18v11M8 24V12h13v12M43 24V12h13v12" fill="#255865" stroke="#e1c581" stroke-width="2" />
        <path d="M26 54V38q6-12 12 0v16" fill="#0d2831" />
        <path d="M32 7V0l13 4-13 5" fill="#84dbc0" stroke="#e1c581" /></svg
      ><span :title="state.castle.name">{{ state.castle.name }}</span>
    </button>
    <div v-if="!placing && !state?.castle" class="castle-map-entry">
      <button :disabled="!state?.eligible" @click="begin">
        {{ state?.eligible ? 'Build a castle' : 'Castle · Level 25' }}
      </button>
    </div>
    <section v-if="placing" class="castle-placement" aria-label="Castle placement">
      <header>
        <h2>Found your castle</h2>
        <button aria-label="Cancel castle placement" @click="cancel">×</button>
      </header>
      <p>
        Click open ground inside a city’s dashed ring, at least {{ state?.placement.clearance }} map units from city and
        landmark icons. Avoid forests, bogs, mountains and water.
      </p>
      <button class="current-plot" :disabled="pending" @click="pick(position)">Check my current position</button>
      <p v-if="pending" role="status">Checking this plot…</p>
      <p v-else-if="site" :class="site.valid ? 'site-valid' : 'site-invalid'" role="status">
        {{ site.reason }} {{ site.city ? `Near ${site.city}.` : '' }}
      </p>
      <template v-if="site?.valid && chosen && state"
        ><label>Castle name<input v-model="name" maxlength="40" minlength="3" /></label>
        <p class="foundation-price">
          {{ state.foundationGold.toLocaleString() }} gold <small>· You have {{ state.gold.toLocaleString() }}</small>
        </p>
        <p class="placement-warning">This plot is permanent. Your castle will be visible only to you.</p>
        <button
          class="found-button"
          :disabled="pending || name.trim().length < 3 || state.gold < state.foundationGold"
          @click="found"
        >
          Found castle · {{ state.foundationGold.toLocaleString() }} gold
        </button>
        <p v-if="state.gold < state.foundationGold" class="site-invalid">Not enough gold.</p></template
      >
    </section>
    <span
      v-if="placing && chosen"
      class="castle-plot-pin"
      :class="{ invalid: !site?.valid }"
      :style="pointStyle(chosen)"
      aria-hidden="true"
      >⌖</span
    >
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ActionToasts from '@/components/ActionToasts';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { castlesApi, type CastleState, type CastleSite } from './api';
const props = defineProps<{ camera: { x: number; y: number; scale: number }; position: { x: number; y: number } }>();
const emit = defineEmits<{ placing: [active: boolean]; locate: [point: { x: number; y: number }] }>();
const router = useRouter(),
  route = useRoute(),
  user = useCurrentUserStore();
const state = ref<CastleState | null>(null),
  placing = ref(false),
  pending = ref(false),
  error = ref('');
const chosen = ref<{ x: number; y: number } | null>(null),
  site = ref<CastleSite | null>(null),
  name = ref('');
let request = 0,
  disposed = false;
const pointStyle = (point: { x: number; y: number }) => ({
  left: `${point.x * props.camera.scale + props.camera.x}px`,
  top: `${point.y * props.camera.scale + props.camera.y}px`,
});
function begin() {
  if (!state.value?.eligible || state.value.castle) return;
  placing.value = true;
  error.value = '';
  emit('placing', true);
}
function cancel() {
  request++;
  pending.value = false;
  placing.value = false;
  chosen.value = null;
  site.value = null;
  emit('placing', false);
  if (route.query.castle) void router.replace({ path: '/', query: { ...route.query, castle: undefined } });
}
async function pick(point: { x: number; y: number }) {
  if (!placing.value || pending.value) return;
  const serial = ++request;
  chosen.value = { x: Math.round(point.x * 1000) / 1000, y: Math.round(point.y * 1000) / 1000 };
  site.value = null;
  error.value = '';
  pending.value = true;
  try {
    const result = await castlesApi.site(chosen.value.x, chosen.value.y);
    if (!disposed && serial === request) site.value = result;
  } catch (reason) {
    if (serial === request) error.value = reason instanceof Error ? reason.message : 'Could not check this plot.';
  } finally {
    if (serial === request) pending.value = false;
  }
}
async function found() {
  if (pending.value || !site.value?.valid || !chosen.value) return;
  pending.value = true;
  error.value = '';
  try {
    await castlesApi.create(name.value.trim(), chosen.value.x, chosen.value.y);
    await user.fetchCurrentUser(true);
    await router.push('/castle');
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not build your castle.';
  } finally {
    pending.value = false;
  }
}
function followRoute() {
  if (route.query.castle === 'place') begin();
  if (route.query.castle === 'locate' && state.value?.castle) emit('locate', state.value.castle);
}
watch(() => route.query.castle, followRoute);
onMounted(async () => {
  name.value = `${user.user?.name ?? 'My'} Keep`.slice(0, 40);
  try {
    const result = await castlesApi.get();
    if (disposed) return;
    state.value = result;
    followRoute();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Castle service unavailable.';
  }
});
onUnmounted(() => {
  disposed = true;
  request++;
});
defineExpose({ pick });
</script>
<style scoped>
.castle-map-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 21;
}
.castle-ranges {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.castle-map-entry {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  max-width: calc(100% - 160px);
}
.castle-map-entry button,
.current-plot {
  padding: 10px 18px;
  border: 1px solid #b79d62;
  background: #112d37ed;
  border-radius: 9px;
  color: #f2d58c;
  cursor: pointer;
}
.castle-map-entry button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.castle-map-entry span {
  display: block;
  background: #392a2c;
  color: #ffd1b7;
  padding: 6px;
}
.private-castle-marker {
  position: absolute;
  transform: translate(-50%, -50%) scale(var(--marker-scale, 1));
  display: flex;
  align-items: center;
  flex-direction: column;
  pointer-events: auto;
  cursor: pointer;
  filter: drop-shadow(0 4px 6px #0007);
  border: 0;
  background: transparent;
  width: max-content;
  max-width: 140px;
  padding: 0;
  color: #f5dea1;
}
.private-castle-marker span {
  padding: 3px 7px;
  background: #102b33ed;
  border: 1px solid #b09b65;
  border-radius: 7px;
  font:
    13px Georgia,
    serif;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.castle-placement {
  pointer-events: auto;
  position: absolute;
  bottom: 24px;
  left: 24px;
  width: min(340px, calc(100% - 48px));
  max-height: calc(100% - 48px);
  overflow: auto;
  padding: 20px;
  border: 1px solid #ba9e65;
  background: #0c2934f5;
  color: #c4d6cf;
  border-radius: 14px;
  box-shadow: 0 14px 50px #0006;
}
.castle-placement header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.castle-placement h2 {
  font:
    24px Georgia,
    serif;
  color: #f1daa0;
  margin: 0;
}
.castle-placement header button {
  color: #e8cb8a;
  font-size: 26px;
  background: none;
  border: 0;
  cursor: pointer;
}
.castle-placement p {
  font-size: 13px;
  line-height: 1.6;
  margin: 12px 0;
}
.castle-placement label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.castle-placement input {
  background: #071e28;
  color: #e5e5cd;
  border: 1px solid #59777b;
  border-radius: 6px;
  padding: 9px;
  width: 100%;
}
.site-valid {
  color: #91ddbb;
}
.site-invalid {
  color: #ffb6a1;
}
.castle-placement .foundation-price {
  color: #f1cf79;
  font-size: 19px;
}
.foundation-price small {
  font-size: 12px;
}
.placement-warning {
  color: #a9bfb7;
}
.found-button {
  border: 1px solid #ecd291;
  border-radius: 7px;
  background: #ddbe75;
  color: #152b31;
  padding: 12px;
  width: 100%;
  font-weight: 700;
  cursor: pointer;
}
.found-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.castle-plot-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 50px;
  color: #8affc7;
  text-shadow: 0 0 3px #08252b;
}
.castle-plot-pin.invalid {
  color: #ffa888;
}
@media (max-width: 600px) {
  .castle-placement {
    bottom: 12px;
    left: 12px;
    width: calc(100% - 24px);
    max-height: 60%;
  }
  .castle-map-entry {
    top: 70px;
    left: 12px;
    transform: none;
  }
}
</style>
