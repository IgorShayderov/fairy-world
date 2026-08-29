import { reactive, ref } from 'vue';

export function useCharacter(initialX = 1000, initialY = 600, mapWidth = 2400, mapHeight = 1600) {
  const pos = reactive({ x: initialX, y: initialY });
  const target = reactive({ x: initialX, y: initialY });
  const isMoving = ref(false);

  const speed = 1.5;

  const walkTo = (x: number, y: number) => {
    target.x = Math.max(0, Math.min(x, mapWidth));
    target.y = Math.max(0, Math.min(y, mapHeight));

    isMoving.value = true;
  };

  // Пересчет координат для одного кадра (возвращает true, если все еще идем)
  const update = () => {
    if (!isMoving.value) return false;

    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // Если персонаж почти дошел — примагничиваем его к цели
    if (dist <= speed) {
      pos.x = target.x;
      pos.y = target.y;
      isMoving.value = false;
    } else {
      // Иначе делаем шаг
      pos.x += (dx / dist) * speed;
      pos.y += (dy / dist) * speed;
    }

    return isMoving.value;
  };

  // Отрисовка персонажа и пути к цели
  const render = (ctx: CanvasRenderingContext2D) => {
    // 1. Рисуем пунктирный путь к цели, если двигаемся
    if (isMoving.value) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Рисуем человечка
    const t = isMoving.value ? Date.now() / 100 : 0;
    const swing = isMoving.value ? Math.sin(t) * 12 : 0;

    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ноги
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 20);
    ctx.lineTo(pos.x - 5 + swing, pos.y);
    ctx.moveTo(pos.x, pos.y - 20);
    ctx.lineTo(pos.x + 5 - swing, pos.y);
    ctx.stroke();

    // Туловище
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 45);
    ctx.lineTo(pos.x, pos.y - 20);
    ctx.stroke();

    // Руки
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 40);
    ctx.lineTo(pos.x - 15 - swing, pos.y - 25);
    ctx.moveTo(pos.x, pos.y - 40);
    ctx.lineTo(pos.x + 15 + swing, pos.y - 25);
    ctx.stroke();

    // Голова
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 55, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  return {
    isMoving,
    walkTo,
    update,
    render,
  };
}
