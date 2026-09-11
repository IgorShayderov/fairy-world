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

    <header class="pointer-events-none absolute top-5 left-5 z-10">
      <div class="atlas-panel min-w-[250px] px-5 py-4 text-[#f7e8b5]">
        <div class="mb-1 flex items-center gap-2 text-[10px] font-semibold tracking-[0.32em] text-[#9edbd3] uppercase">
          <span class="h-px w-8 bg-[#78bfb8]/70"></span>
          {{ t('fantasy.realm') }}
        </div>
        <h1 class="font-serif text-2xl leading-tight font-semibold tracking-wide text-[#fff0bd]">
          {{ t('fantasy.mapTitle') }}
        </h1>
        <p class="mt-1 text-xs tracking-wide text-[#c7d7cd]">{{ t('fantasy.mapDescription') }}</p>
      </div>
    </header>

    <aside class="pointer-events-none absolute bottom-5 left-5 z-10 hidden sm:block">
      <div class="atlas-panel px-4 py-3 text-[10px] font-semibold tracking-[0.15em] text-[#d6dfd5] uppercase">
        <div class="mb-2 text-[#8dcfc7]">{{ t('fantasy.legend') }}</div>
        <div class="grid grid-cols-2 gap-x-5 gap-y-2">
          <span class="flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#f6cf72] shadow-[0_0_8px_#f6cf72]"></i>{{ t('fantasy.city') }}</span>
          <span class="flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#a9d48c] shadow-[0_0_8px_#a9d48c]"></i>{{ t('fantasy.village') }}</span>
          <span class="flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#ff8067] shadow-[0_0_8px_#ff8067]"></i>{{ t('fantasy.dungeon') }}</span>
          <span class="flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#8ce5ca] shadow-[0_0_8px_#8ce5ca]"></i>{{ t('fantasy.sanctum') }}</span>
        </div>
      </div>
    </aside>

    <div class="absolute top-5 right-5 z-20 flex flex-col overflow-hidden rounded-xl border border-[#d6bd75]/30 bg-[#102734]/90 shadow-2xl backdrop-blur-md">
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
      <div class="rounded-full border border-[#d6bd75]/20 bg-[#102734]/80 px-4 py-2 text-[10px] tracking-[0.12em] text-[#c8d8cf] uppercase shadow-xl backdrop-blur-md">
        {{ t('fantasy.controlsHint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QIcon } from 'quasar';
import { onMounted, onUnmounted, ref } from 'vue';

import { useCharacter } from '@modules/Game/composables/useCharacter';
import { useMapCamera } from '@modules/Game/composables/useMapCamera';
import { useMapGenerator } from '@modules/Game/composables/useMapGenerator';

const { t } = useTranslation();
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragging = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame: number | null = null;

const mapWidth = 3200;
const mapHeight = 2100;
const initialX = 1470;
const initialY = 1040;

const { renderProceduralMap, isPointOnLand } = useMapGenerator();
const { camera, fitToScreen, startDrag, doDrag, endDrag, zoomAt, zoomBy, screenToMap } = useMapCamera(
  mapWidth,
  mapHeight
);

const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = mapWidth;
offscreenCanvas.height = mapHeight;
const offscreenCtx = offscreenCanvas.getContext('2d');
if (offscreenCtx) renderProceduralMap(offscreenCtx, mapWidth, mapHeight);
const canMoveTo = (x: number, y: number) => Boolean(offscreenCtx && isPointOnLand(offscreenCtx, x, y));
const { isMoving, walkTo, update, render: renderCharacter } = useCharacter(
  initialX,
  initialY,
  mapWidth,
  mapHeight,
  canMoveTo
);

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

const tick = () => {
  const stillMoving = update();
  draw();
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

  const pointer = relativePointer(event);
  const mapCoords = screenToMap(pointer.x, pointer.y);
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
  draw();
};

onMounted(() => {
  resizeCanvas();
  resizeObserver = new ResizeObserver(resizeCanvas);
  if (containerRef.value) resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
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
