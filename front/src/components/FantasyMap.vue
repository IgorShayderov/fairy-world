<template>
  <div ref="containerRef" class="relative h-full w-full overflow-hidden">
    <div class="absolute right-6 bottom-6 z-10 flex flex-col gap-2">
      <button
        @click="handleZoomBtn(0.2)"
        class="flex h-10 w-10 items-center justify-center rounded bg-gray-800/80 text-xl font-bold text-white shadow-lg backdrop-blur transition hover:bg-gray-700"
      >
        +
      </button>
      <button
        @click="handleZoomBtn(-0.2)"
        class="flex h-10 w-10 items-center justify-center rounded bg-gray-800/80 text-xl font-bold text-white shadow-lg backdrop-blur transition hover:bg-gray-700"
      >
        -
      </button>
    </div>

    <canvas
      ref="canvasRef"
      class="absolute inset-0 block h-full w-full cursor-crosshair"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel.prevent="onWheel"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

import { useMapGenerator } from '@modules/Game/composables/useMapGenerator';
import { useCharacter } from '@modules/Game/composables/useCharacter';
import { useMapCamera } from '@modules/Game/composables/useMapCamera';

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;

const mapWidth = 3600;
const mapHeight = 2400;
const initialX = 1000;
const initialY = 600;

// Инициализация composables
const { renderProceduralMap } = useMapGenerator();
const { isMoving, walkTo, update, render: renderCharacter } = useCharacter(initialX, initialY, mapWidth, mapHeight);
const { camera, fitToScreen, startDrag, doDrag, endDrag, zoomAt, zoomBy, screenToMap } = useMapCamera(
  mapWidth,
  mapHeight
);

// Отрисовка статической карты в кэш (Offscreen)
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = mapWidth;
offscreenCanvas.height = mapHeight;
const offscreenCtx = offscreenCanvas.getContext('2d');
if (offscreenCtx) renderProceduralMap(offscreenCtx, mapWidth, mapHeight);

// --- ОСНОВНОЙ РЕНДЕР ---
const draw = () => {
  if (!ctx || !canvasRef.value) return;

  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);

  ctx.drawImage(offscreenCanvas, 0, 0); // Карта
  renderCharacter(ctx); // Персонаж

  ctx.restore();
};

const tick = () => {
  if (update()) {
    draw();
    requestAnimationFrame(tick);
  } else {
    draw(); // Финальный кадр при остановке
  }
};

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---
const resizeCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvasRef.value.width = width * dpr;
  canvasRef.value.height = height * dpr;
  ctx = canvasRef.value.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);

  if (camera.scale === 1 && camera.x === 0) fitToScreen(width, height);
  draw();
};

const onMouseDown = (e: MouseEvent) => startDrag(e.clientX, e.clientY);

const onMouseMove = (e: MouseEvent) => {
  if (doDrag(e.clientX, e.clientY) && !isMoving.value) {
    requestAnimationFrame(draw);
  }
};

const onMouseUp = (e: MouseEvent) => {
  // Если endDrag вернул true, значит это был клик, а не свайп
  if (endDrag(e.clientX, e.clientY) && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const mapCoords = screenToMap(e.clientX - rect.left, e.clientY - rect.top);

    const wasMoving = isMoving.value;
    walkTo(mapCoords.x, mapCoords.y);
    if (!wasMoving) requestAnimationFrame(tick);
  }
};

const onWheel = (e: WheelEvent) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
  if (!isMoving.value) requestAnimationFrame(draw);
};

const handleZoomBtn = (delta: number) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  zoomBy(delta, rect.width, rect.height);
  if (!isMoving.value) requestAnimationFrame(draw);
};

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => window.removeEventListener('resize', resizeCanvas));
</script>

<style scoped>
canvas {
  touch-action: none;
  -webkit-user-drag: none;
  user-select: none;
}
</style>
