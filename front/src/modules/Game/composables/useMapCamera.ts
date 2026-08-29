import { reactive, ref } from 'vue';

export function useMapCamera(mapWidth: number, mapHeight: number) {
  // Состояние камеры
  const camera = reactive({ x: 0, y: 0, scale: 1 });
  const limits = { min: 0.2, max: 3 };
  const isDragging = ref(false);

  // Внутренние переменные для расчетов перетаскивания
  const dragStart = { x: 0, y: 0 };
  const mouseStart = { x: 0, y: 0 };

  // Автоматическая подгонка карты под размер экрана при запуске
  const fitToScreen = (screenWidth: number, screenHeight: number) => {
    camera.scale = Math.min(screenWidth / mapWidth, screenHeight / mapHeight) * 0.9;
    limits.min = camera.scale * 0.5;
    camera.x = (screenWidth - mapWidth * camera.scale) / 2;
    camera.y = (screenHeight - mapHeight * camera.scale) / 2;
  };

  // --- Логика мыши ---
  const startDrag = (clientX: number, clientY: number) => {
    isDragging.value = true;
    dragStart.x = clientX - camera.x;
    dragStart.y = clientY - camera.y;
    mouseStart.x = clientX;
    mouseStart.y = clientY;
  };

  const doDrag = (clientX: number, clientY: number) => {
    if (!isDragging.value) return false;
    camera.x = clientX - dragStart.x;
    camera.y = clientY - dragStart.y;
    return true; // Возвращает true, если карта сдвинулась
  };

  const endDrag = (clientX: number, clientY: number) => {
    isDragging.value = false;
    // Если мышь сдвинулась меньше чем на 5px — это был клик
    const dist = Math.hypot(clientX - mouseStart.x, clientY - mouseStart.y);
    return dist < 5;
  };

  // --- Логика зума ---
  const zoomAt = (mouseX: number, mouseY: number, deltaY: number) => {
    const zoomFactor = deltaY < 0 ? 1.1 : 0.9;
    const mapX = (mouseX - camera.x) / camera.scale;
    const mapY = (mouseY - camera.y) / camera.scale;

    camera.scale = Math.max(limits.min, Math.min(camera.scale * zoomFactor, limits.max));
    camera.x = mouseX - mapX * camera.scale;
    camera.y = mouseY - mapY * camera.scale;
  };

  const zoomBy = (delta: number, screenWidth: number, screenHeight: number) => {
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const mapX = (centerX - camera.x) / camera.scale;
    const mapY = (centerY - camera.y) / camera.scale;

    camera.scale = Math.max(limits.min, Math.min(camera.scale + delta, limits.max));
    camera.x = centerX - mapX * camera.scale;
    camera.y = centerY - mapY * camera.scale;
  };

  // Конвертация экранных координат в координаты карты
  const screenToMap = (mouseX: number, mouseY: number) => {
    return {
      x: (mouseX - camera.x) / camera.scale,
      y: (mouseY - camera.y) / camera.scale,
    };
  };

  return {
    camera,
    fitToScreen,
    startDrag,
    doDrag,
    endDrag,
    zoomAt,
    zoomBy,
    screenToMap,
  };
}
