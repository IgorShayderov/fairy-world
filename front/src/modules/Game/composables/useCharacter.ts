import { reactive, ref } from 'vue';

export function useCharacter(
  initialX = 1000,
  initialY = 600,
  mapWidth = 2400,
  mapHeight = 1600,
  canMoveTo: (x: number, y: number) => boolean = () => true
) {
  const pos = reactive({ x: initialX, y: initialY });
  const target = reactive({ x: initialX, y: initialY });
  const isMoving = ref(false);

  const speed = 1;

  const walkTo = (x: number, y: number) => {
    const nextX = Math.max(0, Math.min(x, mapWidth));
    const nextY = Math.max(0, Math.min(y, mapHeight));
    if (!canMoveTo(nextX, nextY)) return false;

    target.x = nextX;
    target.y = nextY;

    isMoving.value = true;
    return true;
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
      const nextX = pos.x + (dx / dist) * speed;
      const nextY = pos.y + (dy / dist) * speed;
      if (!canMoveTo(nextX, nextY)) {
        isMoving.value = false;
        return false;
      }
      pos.x = nextX;
      pos.y = nextY;
    }

    return isMoving.value;
  };

  const render = (ctx: CanvasRenderingContext2D) => {
    if (isMoving.value) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = 'rgba(255, 225, 145, 0.8)';
      ctx.lineWidth = 5;
      ctx.setLineDash([6, 14]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(target.x, target.y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 226, 147, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    const pulse = isMoving.value ? 1 + Math.sin(Date.now() / 130) * 0.08 : 1;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ffe69b';
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(25, 35, 38, 0.94)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#f5d77c';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fff2bd';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#f5d77c';
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(7, -25);
    ctx.lineTo(-7, -25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  return {
    isMoving,
    walkTo,
    update,
    render,
  };
}
