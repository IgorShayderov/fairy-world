import { reactive, ref } from 'vue';

export function useMapCamera(mapWidth: number, mapHeight: number) {
  const camera = reactive({ x: 0, y: 0, scale: 1 });
  const limits = { min: 0.1, max: 3 };
  const defaultZoom = 1.3;
  const isDragging = ref(false);
  const dragStart = { x: 0, y: 0 };
  const mouseStart = { x: 0, y: 0 };
  const viewport = { width: 0, height: 0 };

  const constrain = () => {
    camera.x = Math.min(0, Math.max(viewport.width - mapWidth * camera.scale, camera.x));
    camera.y = Math.min(0, Math.max(viewport.height - mapHeight * camera.scale, camera.y));
  };

  const setViewport = (width: number, height: number) => {
    viewport.width = width;
    viewport.height = height;
    limits.min = Math.max(width / mapWidth, height / mapHeight);
    limits.max = Math.max(3, limits.min * defaultZoom);
    camera.scale = Math.max(limits.min, Math.min(camera.scale, limits.max));
  };

  const fitToScreen = (screenWidth: number, screenHeight: number) => {
    setViewport(screenWidth, screenHeight);
    camera.scale = limits.min * defaultZoom;

    camera.x = (screenWidth - mapWidth * camera.scale) / 2;
    camera.y = (screenHeight - mapHeight * camera.scale) / 2;
    constrain();
  };

  const startDrag = (clientX: number, clientY: number) => {
    isDragging.value = true;
    dragStart.x = clientX - camera.x;
    dragStart.y = clientY - camera.y;
    mouseStart.x = clientX;
    mouseStart.y = clientY;
  };

  const centerOn = (x: number, y: number, width: number, height: number) => {
    setViewport(width, height);
    camera.x = width / 2 - x * camera.scale;
    camera.y = height / 2 - y * camera.scale;
    constrain();
  };

  const doDrag = (clientX: number, clientY: number) => {
    if (!isDragging.value) return false;
    camera.x = clientX - dragStart.x;
    camera.y = clientY - dragStart.y;
    constrain();
    return true;
  };

  const endDrag = (clientX: number, clientY: number) => {
    isDragging.value = false;
    const dist = Math.hypot(clientX - mouseStart.x, clientY - mouseStart.y);
    return dist < 5;
  };

  const zoomAt = (mouseX: number, mouseY: number, deltaY: number) => {
    const zoomFactor = deltaY < 0 ? 1.1 : 0.9;
    const mapX = (mouseX - camera.x) / camera.scale;
    const mapY = (mouseY - camera.y) / camera.scale;

    camera.scale = Math.max(limits.min, Math.min(camera.scale * zoomFactor, limits.max));
    camera.x = mouseX - mapX * camera.scale;
    camera.y = mouseY - mapY * camera.scale;
    constrain();
  };

  const zoomBy = (delta: number, screenWidth: number, screenHeight: number) => {
    setViewport(screenWidth, screenHeight);
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const mapX = (centerX - camera.x) / camera.scale;
    const mapY = (centerY - camera.y) / camera.scale;

    camera.scale = Math.max(limits.min, Math.min(camera.scale + delta, limits.max));
    camera.x = centerX - mapX * camera.scale;
    camera.y = centerY - mapY * camera.scale;
    constrain();
  };

  const screenToMap = (mouseX: number, mouseY: number) => {
    return {
      x: (mouseX - camera.x) / camera.scale,
      y: (mouseY - camera.y) / camera.scale,
    };
  };

  return {
    camera,
    centerOn,
    fitToScreen,
    startDrag,
    doDrag,
    endDrag,
    zoomAt,
    zoomBy,
    screenToMap,
  };
}
