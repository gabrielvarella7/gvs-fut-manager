import type {
  HighlightEntity,
  HighlightLanceMeta,
  HighlightRoster,
  SimulationFrame,
} from './types';

/** Formation slots in pitch % (x along length, y across width). Home attacks +x. */
const HOME_SLOTS: { x: number; y: number }[] = [
  { x: 6, y: 50 },
  { x: 18, y: 18 },
  { x: 18, y: 38 },
  { x: 18, y: 62 },
  { x: 18, y: 82 },
  { x: 38, y: 28 },
  { x: 38, y: 50 },
  { x: 38, y: 72 },
  { x: 58, y: 22 },
  { x: 58, y: 50 },
  { x: 58, y: 78 },
];

function awaySlot(s: { x: number; y: number }): { x: number; y: number } {
  return { x: 100 - s.x, y: 100 - s.y };
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function isDangerousChance(meta?: HighlightLanceMeta | null): boolean {
  if (!meta) return false;
  if (meta.woodwork || meta.hardSave || meta.redCard) return true;
  if (meta.onTarget && (meta.xg ?? 0) >= 0.12) return true;
  if ((meta.xg ?? 0) >= 0.18) return true;
  return false;
}

/**
 * Build one SimulationFrame for the circular buffer.
 * `phase` 0..1 advances the attack toward the goal of `attackingHome`.
 */
export function synthesizeFrame(opts: {
  clock: number;
  roster: HighlightRoster;
  attackingHome: boolean;
  phase: number;
  focusPlayerId?: number;
  seed?: number;
  banner?: string;
}): SimulationFrame {
  const seed = opts.seed ?? Math.floor(opts.clock * 100);
  const phase = clamp(opts.phase, 0, 1);
  const push = phase * 28;

  const entities: HighlightEntity[] = [];
  opts.roster.mandante.forEach((p, i) => {
    const slot = HOME_SLOTS[i % HOME_SLOTS.length]!;
    const jx = (jitter(seed + p.id) - 0.5) * 4;
    const jy = (jitter(seed + p.id * 3) - 0.5) * 4;
    entities.push({
      id: p.id,
      nome: p.nome,
      numero: p.numero,
      lado: 'H',
      x: clamp(slot.x + (opts.attackingHome ? push : -push * 0.35) + jx),
      y: clamp(slot.y + jy),
    });
  });
  opts.roster.visitante.forEach((p, i) => {
    const slot = awaySlot(HOME_SLOTS[i % HOME_SLOTS.length]!);
    const jx = (jitter(seed + p.id + 17) - 0.5) * 4;
    const jy = (jitter(seed + p.id * 5) - 0.5) * 4;
    entities.push({
      id: p.id,
      nome: p.nome,
      numero: p.numero,
      lado: 'A',
      x: clamp(slot.x + (opts.attackingHome ? -push * 0.35 : -push) + jx),
      y: clamp(slot.y + jy),
    });
  });

  let ballX: number;
  let ballY: number;
  const focus = opts.focusPlayerId
    ? entities.find((e) => e.id === opts.focusPlayerId)
    : undefined;
  if (focus) {
    ballX = clamp(focus.x + (opts.attackingHome ? 3 : -3));
    ballY = clamp(focus.y + (jitter(seed + 99) - 0.5) * 2);
  } else if (opts.attackingHome) {
    ballX = clamp(20 + phase * 72);
    ballY = clamp(42 + jitter(seed) * 16);
  } else {
    ballX = clamp(80 - phase * 72);
    ballY = clamp(42 + jitter(seed + 7) * 16);
  }

  return {
    clock: opts.clock,
    ball: { x: ballX, y: ballY },
    entities,
    ...(opts.banner ? { banner: opts.banner } : {}),
  };
}

/**
 * Legacy linear buildup (prefer `buildCm04HighlightClip`).
 * Clock is frozen at clockAtEvent for the whole clip.
 */
export function synthesizeBuildupClip(opts: {
  clockAtEvent: number;
  roster: HighlightRoster;
  attackingHome: boolean;
  focusPlayerId?: number;
  ticks?: number;
  banner?: string;
}): SimulationFrame[] {
  const ticks = opts.ticks ?? 12 * 20;
  const frozen = Math.floor(opts.clockAtEvent);
  const frames: SimulationFrame[] = [];
  for (let i = 0; i < ticks; i++) {
    const t = (i + 1) / ticks;
    frames.push(
      synthesizeFrame({
        clock: frozen,
        roster: opts.roster,
        attackingHome: opts.attackingHome,
        phase: t,
        focusPlayerId: opts.focusPlayerId,
        seed: opts.clockAtEvent * 1000 + i,
        banner: i > ticks - 8 ? opts.banner : undefined,
      }),
    );
  }
  return frames;
}

export function rosterFromEscalacao(
  mandante: { id: number; nome: string; posicao?: string }[],
  visitante: { id: number; nome: string; posicao?: string }[],
): HighlightRoster {
  return {
    mandante: mandante.slice(0, 11).map((j, i) => ({
      id: j.id,
      nome: j.nome,
      numero: i + 1,
      posicao: j.posicao ?? 'MEI',
    })),
    visitante: visitante.slice(0, 11).map((j, i) => ({
      id: j.id,
      nome: j.nome,
      numero: i + 1,
      posicao: j.posicao ?? 'MEI',
    })),
  };
}
