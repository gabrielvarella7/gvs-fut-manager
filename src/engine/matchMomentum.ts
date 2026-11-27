import type { MomentoAtaque } from './matchStats';

/** Sample recorded during the minute loop (pre-smoothing). */
export type PressaoMinuto = {
  minuto: number;
  pressaoM: number;
  pressaoV: number;
};

export type EventoMomento = {
  minuto: number;
  golMandante?: boolean;
  golVisitante?: boolean;
  chanceMandante?: boolean;
  chanceVisitante?: boolean;
};

/**
 * Sofascore-style momentum scaffolding.
 *
 * Raw per-minute attack pressure is smoothed into attack/defense oscillations
 * (multi-minute waves), then spiked by goals/chances. Final UI styling waits
 * on the reference image; this module only owns the data series.
 */

const ALPHA = 0.32;
const WAVE_LEN = 7;
/** How strongly a sustained pressure edge becomes a multi-minute attack wave. */
const WAVE_GAIN = 0.55;
const SPIKE_GOL = 0.42;
const SPIKE_CHANCE = 0.18;
const VALOR_SCALE = 100;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampValor(n: number): number {
  return Math.max(-VALOR_SCALE, Math.min(VALOR_SCALE, n));
}

/** Live playback: only minutes that have already been “played”. */
export function momentoAteMinuto(
  momento: MomentoAtaque[],
  minutoAtual: number,
): MomentoAtaque[] {
  if (minutoAtual <= 0) return [];
  return momento.filter((m) => m.minuto <= minutoAtual);
}

/** Merge frozen first half with a re-sim after a mid-match tactics change. */
export function mesclarSerieMomento(
  anterior: MomentoAtaque[],
  nova: MomentoAtaque[],
  minutoAtual: number,
): MomentoAtaque[] {
  const head = anterior.filter((m) => m.minuto <= minutoAtual);
  const tail = nova.filter((m) => m.minuto > minutoAtual);
  const byMin = new Map<number, MomentoAtaque>();
  for (const m of [...head, ...tail]) byMin.set(m.minuto, m);
  return [...byMin.values()].sort((a, b) => a.minuto - b.minuto);
}

/**
 * Build a continuous 1..minutoFinal series from raw pressure samples + event markers.
 * Missing minutes are filled by carrying the last smoothed pressures (quiet spells).
 */
export function finalizarSerieMomento(
  amostras: PressaoMinuto[],
  eventos: EventoMomento[],
  minutoFinal = 90,
): MomentoAtaque[] {
  const porMinuto = new Map<number, PressaoMinuto>();
  for (const a of amostras) porMinuto.set(a.minuto, a);

  const eventosPorMin = new Map<number, EventoMomento>();
  for (const e of eventos) {
    const prev = eventosPorMin.get(e.minuto) ?? { minuto: e.minuto };
    eventosPorMin.set(e.minuto, {
      minuto: e.minuto,
      golMandante: prev.golMandante || e.golMandante,
      golVisitante: prev.golVisitante || e.golVisitante,
      chanceMandante: prev.chanceMandante || e.chanceMandante,
      chanceVisitante: prev.chanceVisitante || e.chanceVisitante,
    });
  }

  let emaM = 0.5;
  let emaV = 0.5;
  let waveM = 0;
  let waveV = 0;
  let lastM = 0.5;
  let lastV = 0.5;
  const out: MomentoAtaque[] = [];

  for (let minuto = 1; minuto <= minutoFinal; minuto++) {
    const amostra = porMinuto.get(minuto);
    const rawM = amostra ? amostra.pressaoM : lastM;
    const rawV = amostra ? amostra.pressaoV : lastV;
    lastM = rawM;
    lastV = rawV;

    emaM = emaM * (1 - ALPHA) + rawM * ALPHA;
    emaV = emaV * (1 - ALPHA) + rawV * ALPHA;

    // Attack-wave envelope: when one side leads, build a multi-minute push that
    // then decays — the Sofascore “oscillation” feel (UI ref still pending).
    const edge = emaM - emaV;
    if (edge > 0.04) {
      waveM = Math.min(1, waveM + edge / WAVE_LEN);
      waveV = Math.max(0, waveV - 1 / WAVE_LEN);
    } else if (edge < -0.04) {
      waveV = Math.min(1, waveV + -edge / WAVE_LEN);
      waveM = Math.max(0, waveM - 1 / WAVE_LEN);
    } else {
      waveM = Math.max(0, waveM - 0.5 / WAVE_LEN);
      waveV = Math.max(0, waveV - 0.5 / WAVE_LEN);
    }

    let pressaoMandante = clamp01(emaM * (1 - WAVE_GAIN) + waveM * WAVE_GAIN);
    let pressaoVisitante = clamp01(emaV * (1 - WAVE_GAIN) + waveV * WAVE_GAIN);

    const ev = eventosPorMin.get(minuto);
    if (ev?.golMandante) pressaoMandante = clamp01(pressaoMandante + SPIKE_GOL);
    if (ev?.golVisitante) pressaoVisitante = clamp01(pressaoVisitante + SPIKE_GOL);
    if (ev?.chanceMandante) pressaoMandante = clamp01(pressaoMandante + SPIKE_CHANCE);
    if (ev?.chanceVisitante) pressaoVisitante = clamp01(pressaoVisitante + SPIKE_CHANCE);

    const valor = clampValor((pressaoMandante - pressaoVisitante) * VALOR_SCALE);

    out.push({
      minuto,
      valor,
      pressaoMandante,
      pressaoVisitante,
      golMandante: ev?.golMandante || undefined,
      golVisitante: ev?.golVisitante || undefined,
      chanceMandante: ev?.chanceMandante || undefined,
      chanceVisitante: ev?.chanceVisitante || undefined,
    });
  }

  return out;
}

/** Collect goal/chance markers from match events for the momentum series. */
export function eventosMomentoDeLancamentos(
  lancamentos: { minuto: number; tipo: string; timeId?: string }[],
  mandanteId: string,
  visitanteId: string,
): EventoMomento[] {
  const out: EventoMomento[] = [];
  for (const l of lancamentos) {
    if (l.tipo === 'gol') {
      out.push({
        minuto: l.minuto,
        golMandante: l.timeId === mandanteId,
        golVisitante: l.timeId === visitanteId,
      });
    } else if (l.tipo === 'chance') {
      out.push({
        minuto: l.minuto,
        chanceMandante: l.timeId === mandanteId,
        chanceVisitante: l.timeId === visitanteId,
      });
    } else if (l.tipo === 'defesa') {
      // Save by home keeper ⇒ away chance; save by away keeper ⇒ home chance.
      out.push({
        minuto: l.minuto,
        chanceMandante: l.timeId === visitanteId,
        chanceVisitante: l.timeId === mandanteId,
      });
    }
  }
  return out;
}
