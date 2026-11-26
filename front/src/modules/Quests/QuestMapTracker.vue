<template>
  <div v-if="active" class="pointer-events-none absolute inset-0 z-20">
    <ActionToasts :error="error" />
    <button
      v-if="objective && !objective.ready"
      class="quest-map-pin pointer-events-auto absolute"
      :style="{ left: `${objective.x * camera.scale + camera.x}px`, top: `${objective.y * camera.scale + camera.y}px` }"
      :title="objective.description"
      aria-label="Tracked quest objective"
      @click="$emit('locate', objective)"
    >
      ◆
    </button>
    <aside
      v-if="objective || error"
      class="quest-tracker pointer-events-auto absolute top-24 left-5"
      aria-label="Tracked quest"
    >
      <template v-if="objective">
        <strong>{{ objective.title }}</strong>
        <p>{{ objective.description }}</p>
        <p v-if="!objective.ready">
          {{ objective.progress }} / {{ objective.target }} ·
          {{ Math.round(Math.hypot(position.x - objective.x, position.y - objective.y)) }} map units away
        </p>
        <div class="flex flex-wrap gap-2">
          <button v-if="!objective.ready" @click="$emit('locate', objective)">Locate</button>
          <button v-if="objective.investigate" :disabled="pending" @click="investigate">Investigate</button>
          <RouterLink to="/quests">Journal</RouterLink>
          <button @click="untrack">Untrack</button>
        </div>
      </template>
      <button v-else @click="load">Retry quest tracker</button>
    </aside>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';

import ActionToasts from '@/components/ActionToasts';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { loadTrackedObjective, storyAction, trackQuest, trackingVersion, type TrackedObjective } from './stories';
const props = defineProps<{
  active: boolean;
  camera: { x: number; y: number; scale: number };
  position: { x: number; y: number };
}>();
defineEmits<{ locate: [point: { x: number; y: number }] }>();
const user = useCurrentUserStore();
const objective = ref<TrackedObjective | null>(null),
  error = ref(''),
  pending = ref(false);
let generation = 0;
async function load() {
  const request = ++generation;
  if (!props.active || !user.user) return;
  try {
    const result = await loadTrackedObjective(user.user.id);
    if (request === generation) {
      objective.value = result;
      error.value = '';
    }
  } catch (reason) {
    if (request === generation)
      error.value = reason instanceof Error ? reason.message : 'Could not refresh tracked quest';
  }
}
async function investigate() {
  if (pending.value || !objective.value?.storyCode) return;
  pending.value = true;
  error.value = '';
  try {
    await storyAction(objective.value.storyCode, 'investigate');
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not investigate location';
  } finally {
    pending.value = false;
  }
}
function untrack() {
  if (user.user) trackQuest(user.user.id, null);
  objective.value = null;
}
watch(
  () => [props.active, user.user?.id, trackingVersion.value],
  () => {
    void load();
  },
  { immediate: true }
);
const timer = setInterval(() => {
  if (!document.hidden && props.active && objective.value) void load();
}, 30000);
onUnmounted(() => {
  generation++;
  clearInterval(timer);
});
</script>
<style scoped>
.quest-tracker {
  width: min(290px, calc(100% - 100px));
  padding: 12px;
  border: 1px solid #b59b58;
  border-radius: 10px;
  background: #102734ed;
  color: #e8dcc0;
  font-size: 12px;
}
.quest-tracker p {
  margin: 5px 0 8px;
}
.quest-tracker button,
.quest-tracker a {
  border: 1px solid #897543;
  border-radius: 5px;
  padding: 4px 8px;
  color: #ffe3a4;
}
.quest-map-pin {
  transform: translate(-50%, -50%);
  color: #ffe3a4;
  background: #102734;
  border: 2px solid #ffe3a4;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  box-shadow: 0 0 0 7px #ffe3a433;
}
</style>
