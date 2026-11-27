import type { SimulationFrame } from '../../../engine/highlights/types';

type LabelSlot = { x: number; y: number; text: string; prio: number };

/**
 * CM 03/04 look: green pitch, yellow FROZEN clock, numbered circles.
 * Name labels are deconflicted (carrier + near-ball first; others may hide).
 */
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

  // Boxes — left = home 1st-half goal (x≈0), right = away 1st-half goal (x≈100)
  const boxW = width * 0.14;
  const boxH = height * 0.44;
  ctx.strokeRect(pad, (height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(width - pad - boxW, (height - boxH) / 2, boxW, boxH);

  const toX = (x: number) => pad + (x / 100) * (width - pad * 2);
  const toY = (y: number) => pad * 0.6 + (y / 100) * (height - pad * 1.2);
  const r = Math.max(7, Math.min(width, height) * 0.028);

  const bx = toX(frame.ball.x);
  const by = toY(frame.ball.y);
  const ballR = Math.max(3, r * 0.45) + (frame.ball.z ?? 0) * 1.2;

  // Circles first
  for (const e of frame.entities) {
    const cx = toX(e.x);
    const cy = toY(e.y);
    ctx.beginPath();
    ctx.fillStyle = e.lado === 'H' ? '#e8e8e8' : '#1e3a8a';
    ctx.strokeStyle = e.temBola
      ? '#facc15'
      : e.lado === 'H'
        ? '#111'
        : '#93c5fd';
    ctx.lineWidth = e.temBola ? 2.4 : 1.5;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = e.lado === 'H' ? '#111' : '#f8fafc';
    ctx.font = `bold ${Math.round(r * 1.1)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(e.numero), cx, cy + 0.5);
  }

  // Ball (after players so it sits on top)
  ctx.beginPath();
  ctx.fillStyle = '#f5f5f4';
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 1;
  ctx.arc(bx, by - (frame.ball.z ?? 0) * 2, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Name labels — priority + collision cull
  const fontPx = Math.max(8, Math.round(r * 0.85));
  ctx.font = `${fontPx}px ui-sans-serif, system-ui, sans-serif`;
  const slots: LabelSlot[] = frame.entities.map((e) => {
    const cx = toX(e.x);
    const cy = toY(e.y);
    const distBall = Math.hypot(e.x - frame.ball.x, e.y - frame.ball.y);
    const short = e.nome.split(' ').pop() ?? e.nome;
    const prio = e.temBola ? 100 : Math.max(0, 40 - distBall);
    return {
      x: cx,
      y: cy + r + 1,
      text: short.slice(0, 10),
      prio,
    };
  });
  slots.sort((a, b) => b.prio - a.prio);

  const placed: { x: number; y: number; w: number }[] = [];
  const minDist = fontPx * 3.2;
  let shown = 0;
  const maxLabels = 8;

  for (const s of slots) {
    if (shown >= maxLabels) break;
    if (s.prio < 8 && shown >= 4) continue;
    const tw = ctx.measureText(s.text).width;
    let y = s.y;
    let ok = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const yy = s.y + attempt * (fontPx + 2) * (attempt % 2 === 0 ? 1 : -1);
      const clash = placed.some(
        (p) => Math.hypot(p.x - s.x, p.y - yy) < minDist || Math.abs(p.x - s.x) < (p.w + tw) * 0.45 && Math.abs(p.y - yy) < fontPx + 2,
      );
      if (!clash) {
        y = yy;
        ok = true;
        break;
      }
    }
    if (!ok) continue;
    placed.push({ x: s.x, y, w: tw });
    shown++;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(s.x - tw / 2 - 2, y - 1, tw + 4, fontPx + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(s.text, s.x, y);
  }

  // Yellow FROZEN clock (CM04) — constant for the whole clip
  const min = Math.floor(frame.clock);
  const clock = `${min}'`;
  ctx.fillStyle = '#facc15';
  ctx.font = `bold ${Math.max(14, Math.round(height * 0.07))}px ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(clock, pad * 0.35, pad * 0.25);

  if (frame.faseOrganica) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.font = `${Math.max(9, Math.round(height * 0.035))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(frame.faseOrganica.replace(/_/g, ' '), pad * 0.35, pad * 0.25 + height * 0.075);
  }

  if (frame.banner) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.max(11, Math.round(height * 0.055))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text =
      frame.banner.length > 52 ? `${frame.banner.slice(0, 50)}…` : frame.banner;
    ctx.fillText(text, width / 2, height * 0.89);
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
