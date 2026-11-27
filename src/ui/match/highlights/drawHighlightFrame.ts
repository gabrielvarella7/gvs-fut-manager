import type { SimulationFrame } from '../../../engine/highlights/types';

/** CM 03/04 look: green pitch, yellow clock, numbered circles. */
export function drawHighlightFrame(
  ctx: CanvasRenderingContext2D,
  frame: SimulationFrame,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);

  // Pitch
  ctx.fillStyle = '#1a5c2e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#17632f';
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) ctx.fillRect((i / 10) * width, 0, width / 10, height);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, width * 0.003);
  const pad = width * 0.04;
  ctx.strokeRect(pad, pad * 0.6, width - pad * 2, height - pad * 1.2);

  // Halfway
  ctx.beginPath();
  ctx.moveTo(width / 2, pad * 0.6);
  ctx.lineTo(width / 2, height - pad * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  // Boxes
  const boxW = width * 0.14;
  const boxH = height * 0.44;
  ctx.strokeRect(pad, (height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(width - pad - boxW, (height - boxH) / 2, boxW, boxH);

  const toX = (x: number) => pad + (x / 100) * (width - pad * 2);
  const toY = (y: number) => pad * 0.6 + (y / 100) * (height - pad * 1.2);
  const r = Math.max(7, Math.min(width, height) * 0.028);

  for (const e of frame.entities) {
    const cx = toX(e.x);
    const cy = toY(e.y);
    ctx.beginPath();
    ctx.fillStyle = e.lado === 'H' ? '#e8e8e8' : '#1e3a8a';
    ctx.strokeStyle = e.lado === 'H' ? '#111' : '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = e.lado === 'H' ? '#111' : '#f8fafc';
    ctx.font = `bold ${Math.round(r * 1.1)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(e.numero), cx, cy + 0.5);

    // Short name under circle
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${Math.max(8, Math.round(r * 0.85))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    const short = e.nome.split(' ').pop() ?? e.nome;
    ctx.fillText(short.slice(0, 10), cx, cy + r + 1);
  }

  // Ball
  const bx = toX(frame.ball.x);
  const by = toY(frame.ball.y);
  ctx.beginPath();
  ctx.fillStyle = '#f5f5f4';
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 1;
  ctx.arc(bx, by, Math.max(3, r * 0.45), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Yellow clock (CM04)
  const min = Math.floor(frame.clock);
  const clock = `${min}'`;
  ctx.fillStyle = '#facc15';
  ctx.font = `bold ${Math.max(14, Math.round(height * 0.07))}px ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(clock, pad * 0.35, pad * 0.25);

  if (frame.banner) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.max(12, Math.round(height * 0.08))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.banner, width / 2, height * 0.89);
  }
}

/** Play clip frames via rAF at ticksPerSecond * speed. Resolves when done. */
export function playClipOnCanvas(
  canvas: HTMLCanvasElement,
  frames: SimulationFrame[],
  ticksPerSecond: number,
  speed: number,
  signal?: { cancelled: boolean },
): Promise<void> {
  return new Promise((resolve) => {
    if (frames.length === 0) {
      resolve();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve();
      return;
    }
    const frameMs = 1000 / Math.max(1, ticksPerSecond * speed);
    let i = 0;
    let last = performance.now();
    let acc = 0;

    const step = (now: number) => {
      if (signal?.cancelled) {
        resolve();
        return;
      }
      acc += now - last;
      last = now;
      while (acc >= frameMs && i < frames.length) {
        acc -= frameMs;
        const w = canvas.width;
        const h = canvas.height;
        drawHighlightFrame(ctx, frames[i]!, w, h);
        i++;
      }
      if (i >= frames.length) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    drawHighlightFrame(ctx, frames[0]!, canvas.width, canvas.height);
    requestAnimationFrame(step);
  });
}
