<template>
  <div ref="containerRef" class="fantasy-map relative h-full w-full overflow-hidden bg-[#0b2432]">
    <canvas
      ref="canvasRef"
      class="absolute inset-0 block h-full w-full"
      :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @wheel.prevent="onWheel"
    ></canvas>

    <div class="map-vignette pointer-events-none absolute inset-0"></div>
    <div class="map-grain pointer-events-none absolute inset-0 opacity-25"></div>

    <div class="absolute top-5 left-5 z-10 flex max-w-[calc(100%-6rem)] flex-col items-start gap-4">
      <ActiveBuffs compact :buffs="currentUserStore.user?.activeBuffs ?? []" />
    </div>

    <div
      class="absolute top-5 right-5 z-20 flex flex-col overflow-hidden rounded-xl border border-[#d6bd75]/30 bg-[#102734]/90 shadow-2xl backdrop-blur-md"
    >
      <button class="map-control" :aria-label="t('fantasy.zoomIn')" @click="handleZoomBtn(0.18)">
        <QIcon name="add" size="19px" />
      </button>
      <div class="h-px bg-[#d6bd75]/20"></div>
      <button class="map-control" :aria-label="t('fantasy.resetView')" @click="resetView">
        <QIcon name="center_focus_strong" size="17px" />
      </button>
      <div class="h-px bg-[#d6bd75]/20"></div>
      <button class="map-control" :aria-label="t('fantasy.zoomOut')" @click="handleZoomBtn(-0.18)">
        <QIcon name="remove" size="19px" />
      </button>
    </div>

    <div class="pointer-events-none absolute right-5 bottom-5 z-10 hidden md:block">
      <div
        class="rounded-full border border-[#d6bd75]/20 bg-[#102734]/80 px-4 py-2 text-[10px] tracking-[0.12em] text-[#c8d8cf] uppercase shadow-xl backdrop-blur-md"
      >
        {{ t('fantasy.controlsHint') }}
      </div>
    </div>

    <aside
      ref="promptCardRef"
      v-if="promptLandmark && !activeLandmark && !activeBattle && !activeDungeonRun"
      class="atlas-panel absolute z-30 w-[min(20rem,calc(100%-2.5rem))] cursor-grab touch-none p-4 text-[#d6e1de] select-none active:cursor-grabbing"
      :style="{ borderColor: promptLandmark.accent, left: `${promptPosition.x}px`, top: `${promptPosition.y}px` }"
      @pointerdown.stop="startPromptDrag"
      @click.stop
    >
      <p class="text-[10px] font-bold tracking-[0.18em] uppercase" :style="{ color: promptLandmark.accent }">
        {{ t('fantasy.landmark.nearby') }}
      </p>
      <div class="mt-1 font-serif text-xl font-semibold text-[#fff0bd]">{{ promptLandmark.name }}</div>
      <p class="mt-1 text-xs text-[#a9bfba]">{{ promptLandmark.subtitle }}</p>
      <div class="mt-3 flex justify-end">
        <button
          class="rounded-lg bg-[#dfc16d] px-3 py-1.5 text-xs font-bold text-[#102831]"
          @pointerdown.stop
          @click="enterPromptedLandmark"
        >
          {{ t('fantasy.landmark.explore') }}
        </button>
      </div>
    </aside>

    <LandmarkEncounter
      v-if="activeLandmark && !activeBattle && !activeDungeonRun && !showQuestOffers && !showPartyLobby"
      :landmark="activeLandmark"
      :pending="landmarkPending"
      :message="landmarkMessage"
      :gems="currentUserStore.user?.gems ?? 0"
      @reset-dungeon="handleDungeonReset"
      :next-entry-at="
        activeLandmark.type === 'sanctum'
          ? currentUserStore.user?.sanctuaryCooldowns?.find(
              (entry) => entry.sanctuaryId === activeLandmark?.sanctuaryId
            )?.nextBlessingAt
          : currentUserStore.user?.dungeonCooldowns?.find((entry) => entry.dungeon === activeLandmark?.name)
              ?.nextEntryAt
      "
      @close="activeLandmark = null"
      @action="handleLandmarkAction"
      @quests="openQuests"
      @party="showPartyLobby = true"
    />

    <DungeonPartyLobby
      v-if="showPartyLobby && activeLandmark?.type === 'dungeon'"
      :dungeon="activeLandmark.name"
      @close="showPartyLobby = false"
      @start="handlePartyStart"
    />

    <TownQuestDialog
      v-if="showQuestOffers && activeLandmark"
      :town-name="activeLandmark.name"
      @close="showQuestOffers = false"
    />

    <DungeonRunEncounter
      v-if="activeDungeonRun"
      :battle="activeDungeonRun"
      :player-name="currentUserStore.user?.name ?? t('fantasy.encounter.traveler')"
      :loading="battlePending"
      @attack="handleDungeonAttack"
      @use-potion="handleDungeonHealthPotion"
      @submit-loot="handleDungeonLootSubmit"
      @leave="handleDungeonLeave"
      @close="handleDungeonClose"
    />

    <BattleEncounter
      v-if="activeBattle"
      :battle="activeBattle"
      :player-name="currentUserStore.user?.name ?? t('fantasy.encounter.traveler')"
      :loading="battlePending"
      @attack="handleAttack"
      @retreat="handleRetreat"
      @close="activeBattle = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { Notify, QIcon } from 'quasar';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { landmarks, movementSpeedAt, type Landmark } from '@/modules/Game/composables/useMapObjects';
import { enterDungeon, receiveBlessing, resetDungeon } from '@/modules/Locations/api';
import type { BattleState, DungeonRunState } from '@/modules/Monsters/api';
import {
  attackDungeonOpponent,
  attackMonster,
  getActiveDungeon,
  leaveDungeon,
  retreatFromBattle,
  submitDungeonPartyLoot,
  useDungeonHealthPotion,
} from '@/modules/Monsters/api';
import routes from '@/routes';
import { useCharacter } from '@modules/Game/composables/useCharacter';
import { useMapCamera } from '@modules/Game/composables/useMapCamera';
import { useMapGenerator } from '@modules/Game/composables/useMapGenerator';

import ActiveBuffs from '@/modules/Game/components/ActiveBuffs.vue';
import BattleEncounter from '@/modules/Game/components/BattleEncounter.vue';
import DungeonPartyLobby from '@/modules/Game/components/DungeonPartyLobby.vue';
import DungeonRunEncounter from '@/modules/Game/components/DungeonRunEncounter.vue';
import LandmarkEncounter from '@/modules/Game/components/LandmarkEncounter.vue';
import TownQuestDialog from '@/modules/Quests/TownQuestDialog.vue';

const { t } = useTranslation();
const currentUserStore = useCurrentUserStore();
const router = useRouter();
const activeLandmark = ref<Landmark | null>(null);
const promptLandmark = ref<Landmark | null>(null);
const promptCardRef = ref<HTMLElement | null>(null);
const promptPosition = ref({ x: 20, y: 20 });
let promptDragOffset: { x: number; y: number } | null = null;

const clampPromptPosition = (x: number, y: number) => {
  const container = containerRef.value;
  const card = promptCardRef.value;
  if (!container || !card) return { x: Math.max(8, x), y: Math.max(8, y) };
  return {
    x: Math.min(Math.max(8, x), Math.max(8, container.clientWidth - card.offsetWidth - 8)),
    y: Math.min(Math.max(8, y), Math.max(8, container.clientHeight - card.offsetHeight - 8)),
  };
};

const dragPrompt = (event: PointerEvent) => {
  if (!promptDragOffset || !containerRef.value) return;
  const bounds = containerRef.value.getBoundingClientRect();
  promptPosition.value = clampPromptPosition(
    event.clientX - bounds.left - promptDragOffset.x,
    event.clientY - bounds.top - promptDragOffset.y
  );
};

const stopPromptDrag = () => {
  promptDragOffset = null;
  window.removeEventListener('pointermove', dragPrompt);
  window.removeEventListener('pointerup', stopPromptDrag);
  window.removeEventListener('pointercancel', stopPromptDrag);
};

const startPromptDrag = (event: PointerEvent) => {
  if (event.button !== 0 || !containerRef.value) return;
  const bounds = containerRef.value.getBoundingClientRect();
  promptDragOffset = {
    x: event.clientX - bounds.left - promptPosition.value.x,
    y: event.clientY - bounds.top - promptPosition.value.y,
  };
  window.addEventListener('pointermove', dragPrompt);
  window.addEventListener('pointerup', stopPromptDrag);
  window.addEventListener('pointercancel', stopPromptDrag);
};
const handleDungeonReset = async () => {
  if (!activeLandmark.value || landmarkPending.value) return;
  landmarkPending.value = true;
  try {
    await resetDungeon(activeLandmark.value.name);
    await currentUserStore.fetchCurrentUser(true);
    landmarkMessage.value = t('fantasy.landmark.resetDone');
  } catch {
    landmarkMessage.value = t('fantasy.landmark.error');
  } finally {
    landmarkPending.value = false;
  }
};
const landmarkPending = ref(false);
const landmarkMessage = ref('');
const openQuests = async () => {
  if (landmarkPending.value) return;
  landmarkPending.value = true;
  try {
    await usersApi.updateMapPosition({ x: Math.round(position.x), y: Math.round(position.y) });
    showQuestOffers.value = true;
  } catch {
    landmarkMessage.value = t('fantasy.landmark.error');
  } finally {
    landmarkPending.value = false;
  }
};
const showQuestOffers = ref(false);
const showPartyLobby = ref(false);
const handlePartyStart = (run: DungeonRunState) => {
  activeDungeonRun.value = run;
  if (currentUserStore.user) currentUserStore.user.hasActiveDungeon = true;
  activeLandmark.value = null;
  showPartyLobby.value = false;
  promptLandmark.value = null;
};
let visitedLandmark: string | null = null;
let disposed = false;
let dungeonPartyTimer: ReturnType<typeof setInterval> | undefined;
const nearbyLandmark = (x: number, y: number) =>
  landmarks.find((landmark) => Math.hypot(x - landmark.x, y - landmark.y) <= 55);

const openLandmark = (landmark: Landmark) => {
  stop();
  visitedLandmark = landmark.name;
  promptLandmark.value = null;
  activeLandmark.value = landmark;
  landmarkMessage.value = '';
  void persistPosition();
};
const enterPromptedLandmark = () => {
  if (promptLandmark.value) openLandmark(promptLandmark.value);
};

const handleLandmarkAction = async () => {
  const landmark = activeLandmark.value;
  if (!landmark || landmarkPending.value) return;
  landmarkPending.value = true;
  try {
    // Wait for the exact arrival coordinates before the server checks proximity.
    await usersApi.updateMapPosition({ x: Math.round(position.x), y: Math.round(position.y) });
    if (landmark.type === 'dungeon') {
      activeDungeonRun.value = await enterDungeon(landmark.name);
      await currentUserStore.fetchCurrentUser(true);
      activeLandmark.value = null;
      promptLandmark.value = null;
      showPartyLobby.value = false;
    } else if (landmark.type === 'sanctum') {
      if (!landmark.sanctuaryId) throw new Error('Unknown sanctuary');
      await receiveBlessing(landmark.sanctuaryId, {
        x: Math.round(position.x),
        y: Math.round(position.y),
      });
      await currentUserStore.fetchCurrentUser(true);
      landmarkMessage.value = t('fantasy.landmark.blessed');
    } else {
      await router.push(routes.shopPath());
    }
  } catch {
    landmarkMessage.value = t('fantasy.landmark.error');
  } finally {
    landmarkPending.value = false;
  }
};
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragging = ref(false);
const activeBattle = ref<BattleState | null>(null);
const activeDungeonRun = ref<DungeonRunState | null>(null);
const encounterPending = ref(false);
const battlePending = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame: number | null = null;

const mapWidth = 3200;
const mapHeight = 2100;
const initialX = 1470;
const initialY = 960;

const { renderProceduralMap, isPointOnLand } = useMapGenerator();
const { camera, centerOn, fitToScreen, startDrag, doDrag, endDrag, zoomAt, zoomBy, screenToMap } = useMapCamera(
  mapWidth,
  mapHeight
);

const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = mapWidth;
offscreenCanvas.height = mapHeight;
const offscreenCtx = offscreenCanvas.getContext('2d');
if (offscreenCtx) renderProceduralMap(offscreenCtx, mapWidth, mapHeight);
const canMoveTo = (x: number, y: number) => Boolean(offscreenCtx && isPointOnLand(offscreenCtx, x, y));
const {
  position,
  isMoving,
  walkTo,
  update,
  render: renderCharacter,
  consumeTravelStep,
  stop,
  setPosition,
} = useCharacter(initialX, initialY, mapWidth, mapHeight, canMoveTo, movementSpeedAt);
let lastSavedPosition = `${initialX}:${initialY}`;

const persistPosition = async (): Promise<boolean> => {
  const nextPosition = {
    x: Math.round(position.x * 1000) / 1000,
    y: Math.round(position.y * 1000) / 1000,
  };
  const positionKey = `${nextPosition.x}:${nextPosition.y}`;
  if (positionKey === lastSavedPosition || encounterPending.value) return false;
  lastSavedPosition = positionKey;
  encounterPending.value = true;
  try {
    const result = await usersApi.updateMapPosition(nextPosition);
    if (currentUserStore.user) currentUserStore.user.mapPosition = result.position;
    if (result.encounter.encountered) {
      stop();
      activeLandmark.value = null;
      promptLandmark.value = null;
      showQuestOffers.value = false;
      showPartyLobby.value = false;
      activeBattle.value = result.encounter.battle;
      draw();
      return true;
    }
  } catch (error) {
    lastSavedPosition = '';
    console.error('Failed to save map position:', error);
  } finally {
    encounterPending.value = false;
  }
  return false;
};

const draw = () => {
  if (!ctx || !canvasRef.value || !containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b2432';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  ctx.drawImage(offscreenCanvas, 0, 0);
  renderCharacter(ctx);
  ctx.restore();
};

const checkForEncounter = async () => {
  const encountered = await persistPosition();
  if (encountered) return;

  if (!disposed && !activeLandmark.value && isMoving.value) animationFrame = requestAnimationFrame(tick);
};

const handleAttack = async () => {
  if (!activeBattle.value || battlePending.value) return;
  battlePending.value = true;
  try {
    activeBattle.value = await attackMonster(activeBattle.value.id);
    if (activeBattle.value.status === 'DEFEAT') {
      handlePlayerDefeat();
    }
    if (activeBattle.value.status !== 'ACTIVE') await currentUserStore.fetchCurrentUser(true);
  } catch (error) {
    console.error('Battle attack failed:', error);
  } finally {
    battlePending.value = false;
  }
};

const handlePlayerDefeat = () => {
  Notify.create({
    type: 'negative',
    color: 'negative',
    timeout: 6000,
    message: `${t('fantasy.encounter.defeat')}. ${t('fantasy.encounter.respawn')}`,
  });
  setPosition(1470, 960);
  lastSavedPosition = '1470:960';
  visitedLandmark = 'EVERCROSS';
  activeLandmark.value = null;
  promptLandmark.value = null;
  if (currentUserStore.user) {
    currentUserStore.user.mapPosition = { x: 1470, y: 960 };
    currentUserStore.user.activeBuffs = [];
  }
  if (containerRef.value) centerOn(1470, 960, containerRef.value.clientWidth, containerRef.value.clientHeight);
  draw();
};

const handleDungeonAttack = async (opponentId: string) => {
  if (!activeDungeonRun.value || battlePending.value) return;
  battlePending.value = true;
  try {
    activeDungeonRun.value = await attackDungeonOpponent(activeDungeonRun.value.id, opponentId);
    if (activeDungeonRun.value.status === 'DEFEAT') {
      handlePlayerDefeat();
    }
    await currentUserStore.fetchCurrentUser(true);
  } catch (error) {
    console.error('Dungeon attack failed:', error);
    Notify.create({
      type: 'negative',
      color: 'negative',
      timeout: 5000,
      message: error instanceof Error ? error.message : t('fantasy.landmark.error'),
    });
  } finally {
    battlePending.value = false;
  }
};

const handleDungeonLeave = async () => {
  if (!activeDungeonRun.value || battlePending.value) return;
  battlePending.value = true;
  try {
    await leaveDungeon(activeDungeonRun.value.id);
    activeDungeonRun.value = null;
    if (currentUserStore.user) currentUserStore.user.hasActiveDungeon = false;
    Notify.create({ type: 'info', message: t('fantasy.dungeonRun.left') });
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error instanceof Error ? error.message : t('fantasy.landmark.error'),
    });
  } finally {
    battlePending.value = false;
  }
};

const handleDungeonClose = async () => {
  const run = activeDungeonRun.value;
  if (run?.party && run.status !== 'ACTIVE') {
    try {
      await leaveDungeon(run.id);
    } catch (error) {
      console.error('Failed to close party dungeon:', error);
    }
  }
  activeDungeonRun.value = null;
  if (currentUserStore.user) currentUserStore.user.hasActiveDungeon = false;
};

const handleDungeonHealthPotion = async (inventoryItemId: number) => {
  if (!activeDungeonRun.value || battlePending.value) return;
  battlePending.value = true;
  try {
    const result = await useDungeonHealthPotion(activeDungeonRun.value.id, inventoryItemId);
    activeDungeonRun.value = result.run;
    await currentUserStore.fetchCurrentUser(true);
    Notify.create({
      type: 'positive',
      message: t('fantasy.dungeonRun.healthRestored', { health: result.healed }),
    });
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error instanceof Error ? error.message : t('fantasy.landmark.error'),
    });
  } finally {
    battlePending.value = false;
  }
};

const handleDungeonLootSubmit = async (itemIds: number[]) => {
  if (!activeDungeonRun.value || battlePending.value) return;
  battlePending.value = true;
  try {
    activeDungeonRun.value = await submitDungeonPartyLoot(activeDungeonRun.value.id, itemIds);
    await currentUserStore.fetchCurrentUser(true);
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error instanceof Error ? error.message : t('fantasy.landmark.error'),
    });
  } finally {
    battlePending.value = false;
  }
};

const handleRetreat = async () => {
  if (!activeBattle.value || battlePending.value) return;
  battlePending.value = true;
  try {
    await retreatFromBattle(activeBattle.value.id);
    activeBattle.value = null;
  } catch (error) {
    console.error('Battle retreat failed:', error);
  } finally {
    battlePending.value = false;
  }
};

const tick = () => {
  if (disposed || activeBattle.value || activeDungeonRun.value || activeLandmark.value) return;
  const stillMoving = update();
  draw();
  const landmark = nearbyLandmark(position.x, position.y);
  if (!landmark) {
    visitedLandmark = null;
    promptLandmark.value = null;
  }
  if (landmark && visitedLandmark !== landmark.name) {
    visitedLandmark = landmark.name;
    promptLandmark.value = landmark;
  }
  if (consumeTravelStep() && !encounterPending.value) {
    animationFrame = null;
    void checkForEncounter();
    return;
  }
  if (!stillMoving) void persistPosition();
  animationFrame = stillMoving ? requestAnimationFrame(tick) : null;
};

const resizeCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasRef.value.width = Math.round(width * dpr);
  canvasRef.value.height = Math.round(height * dpr);
  ctx = canvasRef.value.getContext('2d');
  fitToScreen(width, height);
  centerOn(position.x, position.y, width, height);
  promptPosition.value = clampPromptPosition(promptPosition.value.x, promptPosition.value.y);
  draw();
};

const relativePointer = (event: PointerEvent | WheelEvent) => {
  const rect = canvasRef.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

const onPointerDown = (event: PointerEvent) => {
  canvasRef.value?.setPointerCapture(event.pointerId);
  isDragging.value = true;
  startDrag(event.clientX, event.clientY);
};

const onPointerMove = (event: PointerEvent) => {
  if (doDrag(event.clientX, event.clientY) && !isMoving.value) requestAnimationFrame(draw);
};

const onPointerUp = (event: PointerEvent) => {
  isDragging.value = false;
  canvasRef.value?.releasePointerCapture(event.pointerId);
  if (!endDrag(event.clientX, event.clientY) || !canvasRef.value) return;
  if (activeBattle.value || activeDungeonRun.value || activeLandmark.value || encounterPending.value) return;

  const pointer = relativePointer(event);
  const mapCoords = screenToMap(pointer.x, pointer.y);
  const landmark = nearbyLandmark(mapCoords.x, mapCoords.y);
  if (landmark && nearbyLandmark(position.x, position.y)?.name === landmark.name) {
    openLandmark(landmark);
    draw();
    return;
  }
  const wasMoving = isMoving.value;
  if (!walkTo(mapCoords.x, mapCoords.y)) return;
  if (!wasMoving) animationFrame = requestAnimationFrame(tick);
};

const onPointerCancel = () => {
  isDragging.value = false;
  endDrag(0, 0);
};

const onWheel = (event: WheelEvent) => {
  if (!canvasRef.value) return;
  const pointer = relativePointer(event);
  zoomAt(pointer.x, pointer.y, event.deltaY);
  if (!isMoving.value) requestAnimationFrame(draw);
};

const handleZoomBtn = (delta: number) => {
  if (!containerRef.value) return;
  zoomBy(delta, containerRef.value.clientWidth, containerRef.value.clientHeight);
  if (!isMoving.value) requestAnimationFrame(draw);
};

const resetView = () => {
  if (!containerRef.value) return;
  fitToScreen(containerRef.value.clientWidth, containerRef.value.clientHeight);
  centerOn(position.x, position.y, containerRef.value.clientWidth, containerRef.value.clientHeight);
  draw();
};

onMounted(async () => {
  const user = await currentUserStore.fetchCurrentUser();
  if (disposed) return;
  const savedPosition = user.mapPosition;
  if (savedPosition && setPosition(savedPosition.x, savedPosition.y)) {
    lastSavedPosition = `${savedPosition.x}:${savedPosition.y}`;
  } else {
    lastSavedPosition = '';
    void persistPosition();
  }
  resizeCanvas();
  if (user.hasActiveDungeon) {
    try {
      activeDungeonRun.value = await getActiveDungeon();
    } catch (error) {
      console.error('Failed to restore dungeon run:', error);
    }
  }
  const landmark = nearbyLandmark(position.x, position.y);
  visitedLandmark = landmark?.name ?? null;
  promptLandmark.value = landmark ?? null;
  resizeObserver = new ResizeObserver(resizeCanvas);
  if (containerRef.value) resizeObserver.observe(containerRef.value);
  dungeonPartyTimer = setInterval(() => {
    void (async () => {
      if (!activeDungeonRun.value?.party || battlePending.value) return;
      try {
        const wasChoosingLoot = activeDungeonRun.value.partyLoot?.status === 'CHOOSING';
        const run = await getActiveDungeon();
        if (run) {
          activeDungeonRun.value = run;
          if (wasChoosingLoot && run.partyLoot?.status === 'RESOLVED') {
            await currentUserStore.fetchCurrentUser(true);
          }
        }
      } catch (error) {
        console.error('Failed to refresh party dungeon:', error);
      }
    })();
  }, 2000);
});

onUnmounted(() => {
  disposed = true;
  stopPromptDrag();
  if (dungeonPartyTimer) clearInterval(dungeonPartyTimer);
  void persistPosition();
  resizeObserver?.disconnect();
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
});
</script>

<style scoped>
.fantasy-map {
  isolation: isolate;
}

.map-vignette {
  background:
    linear-gradient(to bottom, rgb(4 16 25 / 35%), transparent 18%, transparent 78%, rgb(3 13 20 / 44%)),
    radial-gradient(circle at center, transparent 42%, rgb(3 13 20 / 45%) 100%);
  box-shadow: inset 0 0 90px rgb(1 10 16 / 55%);
}

.map-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.27'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.atlas-panel {
  border: 1px solid rgb(214 189 117 / 28%);
  border-radius: 14px;
  background: linear-gradient(135deg, rgb(12 34 44 / 94%), rgb(17 43 50 / 82%));
  box-shadow:
    0 18px 45px rgb(1 12 18 / 38%),
    inset 0 0 0 1px rgb(255 242 186 / 5%);
  backdrop-filter: blur(10px);
}

.map-control {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  color: #ecd991;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.map-control:hover {
  color: #fff3bd;
  background: rgb(104 152 144 / 22%);
}

canvas {
  touch-action: none;
  -webkit-user-drag: none;
  user-select: none;
}
</style>
