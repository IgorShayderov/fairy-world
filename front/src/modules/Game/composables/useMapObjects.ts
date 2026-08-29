export function useMapObjects() {
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#eaddc5';
    ctx.fillRect(0, 0, width, height);
  };

  const drawSea = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(0, 1500);
    ctx.bezierCurveTo(600, 1500, 900, 1800, 1200, 2400);
    ctx.lineTo(0, 2400);
    ctx.closePath();
    ctx.fillStyle = '#73a5c6';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#5a89a6';
    ctx.stroke();
  };

  const drawRivers = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#73a5c6';

    ctx.beginPath();
    ctx.moveTo(2700, 0);
    ctx.bezierCurveTo(2500, 600, 1800, 900, 1500, 1200);
    ctx.bezierCurveTo(1200, 1500, 900, 1800, 600, 1900);
    ctx.stroke();

    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(1500, 1200);
    ctx.bezierCurveTo(1800, 1500, 2100, 2100, 1800, 2400);
    ctx.stroke();
  };

  const drawRoads = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(900, 600);
    ctx.lineTo(1500, 900);
    ctx.lineTo(2250, 750);
    ctx.lineTo(2800, 1200);
    ctx.moveTo(1500, 900);
    ctx.lineTo(1950, 1650);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#8b5a2b';
    ctx.setLineDash([12, 18]);
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
    for (let i = 0; i < 60; i++) {
      drawMountain(ctx, 1800 + i * 25 + Math.random() * 20, 300 + Math.random() * 100, 70 + Math.random() * 40);
      drawMountain(ctx, 2700 + Math.random() * 150, 300 + i * 35, 80 + Math.random() * 40);
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
    for (let i = 0; i < 250; i++) {
      drawTree(ctx, 1000 + Math.random() * 450, 1000 + Math.random() * 400, 25 + Math.random() * 15);
      drawTree(ctx, 1950 + Math.random() * 600, 1650 + Math.random() * 450, 30 + Math.random() * 15);
    }
  };

  const drawCastle = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string) => {
    ctx.fillStyle = '#999';
    ctx.fillRect(x - 30, y - 20, 60, 30);
    ctx.fillStyle = '#777';
    ctx.fillRect(x - 40, y - 40, 20, 50);
    ctx.fillRect(x + 20, y - 40, 20, 50);

    ctx.fillStyle = '#b23a3a';
    ctx.beginPath(); ctx.moveTo(x - 45, y - 40); ctx.lineTo(x - 30, y - 70); ctx.lineTo(x - 15, y - 40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 15, y - 40); ctx.lineTo(x + 30, y - 70); ctx.lineTo(x + 45, y - 40); ctx.fill();

    ctx.fillStyle = '#332211';
    ctx.beginPath(); ctx.arc(x, y + 10, 10, Math.PI, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#222';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(name, x, y - 80);
    ctx.shadowBlur = 0;
  };

  const drawCastlesAndCities = (ctx: CanvasRenderingContext2D) => {
    drawCastle(ctx, 900, 600, 'Эронгард');
    drawCastle(ctx, 2250, 750, 'Светловодск');
    drawCastle(ctx, 1950, 1650, 'Драконий Пик');
    drawCastle(ctx, 1500, 900, 'Перекресток');
    drawCastle(ctx, 2800, 1200, 'Сероград');
  };

  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(300, 300);
    for(let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -20); ctx.lineTo(0, -100); ctx.fillStyle = '#b23a3a'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -20); ctx.lineTo(0, -100); ctx.fillStyle = '#8b2a2a'; ctx.fill();
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  };

  return {
    drawBackground,
    drawSea,
    drawRivers,
    drawRoads,
    drawMountainRanges,
    drawForests,
    drawCastlesAndCities,
    drawCompass
  };
}