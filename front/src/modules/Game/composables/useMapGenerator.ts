export function useMapGenerator() {
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#eaddc5';
    ctx.fillRect(0, 0, width, height);
  };

  const drawSea = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(0, 1000);
    ctx.bezierCurveTo(400, 1000, 600, 1200, 800, 1600);
    ctx.lineTo(0, 1600);
    ctx.closePath();
    ctx.fillStyle = '#73a5c6';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#5a89a6';
    ctx.stroke();
  };

  const drawRivers = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#73a5c6';

    // Главная река
    ctx.beginPath();
    ctx.moveTo(1800, 0);
    ctx.bezierCurveTo(1700, 400, 1200, 600, 1000, 800);
    ctx.bezierCurveTo(800, 1000, 600, 1200, 400, 1250);
    ctx.stroke();

    // Приток
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(1000, 800);
    ctx.bezierCurveTo(1200, 1000, 1400, 1400, 1200, 1600);
    ctx.stroke();
  };

  const drawRoads = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(600, 400);
    ctx.lineTo(1000, 600);
    ctx.lineTo(1500, 500);
    ctx.moveTo(1000, 600);
    ctx.lineTo(1300, 1100);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8b5a2b';
    ctx.setLineDash([10, 15]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawMountain = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size / 2, y - size);
    ctx.lineTo(x + size, y);
    ctx.closePath();
    ctx.fillStyle = '#8b8378';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5c554d';
    ctx.stroke();

    // Снежная шапка
    ctx.beginPath();
    ctx.moveTo(x + size * 0.25, y - size * 0.5);
    ctx.lineTo(x + size / 2, y - size);
    ctx.lineTo(x + size * 0.75, y - size * 0.5);
    ctx.lineTo(x + size * 0.6, y - size * 0.4);
    ctx.lineTo(x + size * 0.5, y - size * 0.6);
    ctx.lineTo(x + size * 0.4, y - size * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const drawMountainRanges = (ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < 40; i++) {
      drawMountain(ctx, 1200 + i * 25 + Math.random() * 20, 200 + Math.random() * 100, 60 + Math.random() * 40);
      drawMountain(ctx, 1800 + Math.random() * 150, 200 + i * 35, 70 + Math.random() * 40);
    }
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(x - size * 0.1, y - size * 0.2, size * 0.2, size * 0.4);
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4f7942';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2d4c23';
    ctx.stroke();
  };

  const drawForests = (ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < 150; i++) {
      drawTree(ctx, 700 + Math.random() * 300, 700 + Math.random() * 250, 20 + Math.random() * 15);
      drawTree(ctx, 1300 + Math.random() * 400, 1100 + Math.random() * 300, 25 + Math.random() * 15);
    }
  };

  const drawCastle = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string) => {
    ctx.fillStyle = '#999';
    ctx.fillRect(x - 30, y - 20, 60, 30);
    ctx.fillStyle = '#777';
    ctx.fillRect(x - 40, y - 40, 20, 50);
    ctx.fillRect(x + 20, y - 40, 20, 50);

    ctx.fillStyle = '#b23a3a';
    ctx.beginPath();
    ctx.moveTo(x - 45, y - 40);
    ctx.lineTo(x - 30, y - 70);
    ctx.lineTo(x - 15, y - 40);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 40);
    ctx.lineTo(x + 30, y - 70);
    ctx.lineTo(x + 45, y - 40);
    ctx.fill();

    ctx.fillStyle = '#332211';
    ctx.beginPath();
    ctx.arc(x, y + 10, 10, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(name, x, y - 80);
    ctx.shadowBlur = 0;
  };

  const drawCastlesAndCities = (ctx: CanvasRenderingContext2D) => {
    // Уникальные названия
    drawCastle(ctx, 600, 400, 'Эронгард');
    drawCastle(ctx, 1500, 500, 'Светловодск');
    drawCastle(ctx, 1300, 1100, 'Драконий Пик');
    drawCastle(ctx, 1000, 600, 'Перекресток');
  };

  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(200, 200);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -15);
      ctx.lineTo(0, -80);
      ctx.fillStyle = '#b23a3a';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, -15);
      ctx.lineTo(0, -80);
      ctx.fillStyle = '#8b2a2a';
      ctx.fill();
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  };

  // Главная функция, собирающая всё воедино
  const renderProceduralMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawBackground(ctx, width, height);
    drawSea(ctx);
    drawRivers(ctx);
    drawRoads(ctx);
    drawMountainRanges(ctx);
    drawForests(ctx);
    drawCastlesAndCities(ctx);
    drawCompass(ctx);
  };

  return {
    renderProceduralMap,
  };
}
