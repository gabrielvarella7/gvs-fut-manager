import type { ConfiguracaoTaticaClube } from '../types/tactics';
import type { MomentoAtaque } from './matchStats';

/** Gabriel / C# TacticStyle — maps onto Mestre Mou estilos + instruções. */
export type TacticStyle = 'Possession' | 'HighPress' | 'CounterAttack' | 'ParkTheBus';

export type LancamentoMomento = {
  minuto: number;
  tipo: string;
  timeId?: string;
  texto?: string;
};

export type MomentumGraphInput = {
  minutoFinal?: number;
  lancamentos: LancamentoMomento[];
  mandanteId: string;
  visitanteId: string;
  taticaMandante?: ConfiguracaoTaticaClube;
  taticaVisitante?: ConfiguracaoTaticaClube;
  /** Team strength (OVR / institutional) for skillDiff * 0.5. */
  skillMandante: number;
  skillVisitante: number;
  seed?: number;
};

const DECAY_FACTOR = 0.4;
const MORAL_BOOST_MINUTES = 5;
const MORAL_SCORER = 0.25;
const MORAL_CONCEDED = -0.2;

/** C# tacticBase values. */
const TACTIC_BASE: Record<TacticStyle, number> = {
  Possession: 18,
  HighPress: 12,
  CounterAttack: 4,
  ParkTheBus: 0,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function criarRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerpRange(rnd: () => number, lo: number, hi: number): number {
  return lo + rnd() * (hi - lo);
}

/**
 * Map Mestre Mou estilos/instruções → C# TacticStyle.
 * High press / deep line instructions can override the named style.
 */
export function mapearEstiloTatica(tatica?: ConfiguracaoTaticaClube): TacticStyle {
  if (!tatica) return 'Possession';
  const { estilo_jogo_id: estilo, instrucoes: inst } = tatica;

  if (estilo === 'RETRANCADO_CATIMBA' || inst.altura_linha === 'BAIXA') {
    return 'ParkTheBus';
  }
  if (
    estilo === 'GEGENPRESSING' ||
    inst.intensidade_marcacao === 'SUFOCANTE' ||
    inst.intensidade_marcacao === 'PRESSAO_ALTA'
  ) {
    return 'HighPress';
  }
  if (estilo === 'CONTRA_ATAQUE_DIRETO' || estilo === 'VERTICAL_OBJETIVO') {
    return 'CounterAttack';
  }
  if (estilo === 'TIKI_TAKA' || estilo === 'JOGO_PELAS_PONTAS') {
    return 'Possession';
  }
  return 'Possession';
}

type TeamMatchState = {
  style: TacticStyle;
  pressure: number;
  phaseOffset: number;
  /** Multiplier on rhythm (~1 ± moral); decays after MORAL_BOOST_MINUTES. */
  moralMult: number;
  moralUntilMinute: number;
  /** Smoothed noise for Rt ~ 0.7–1.3. */
  noiseEma: number;
  /** HighPress fatigue accumulator (0..1). */
  fatigue: number;
};

function novoEstado(style: TacticStyle, phaseOffset: number): TeamMatchState {
  return {
    style,
    pressure: 0,
    phaseOffset,
    moralMult: 1,
    moralUntilMinute: 0,
    noiseEma: 0,
    fatigue: 0,
  };
}

/**
 * Event weights (instant pressure that minute) — Gabriel spec bands.
 * Maps Mestre Mou lancamentos onto the C# event model.
 */
function pesoEventoAtacante(
  l: LancamentoMomento,
  rnd: () => number,
): { peso: number; gol: boolean; chance: boolean; perigoso: boolean } {
  const texto = (l.texto ?? '').toLowerCase();
  if (l.tipo === 'gol') {
    return { peso: lerpRange(rnd, 70, 100), gol: true, chance: false, perigoso: true };
  }
  if (l.tipo === 'defesa') {
    // Shot on target saved → dangerous shot pressure for the attacker.
    return { peso: lerpRange(rnd, 30, 50), gol: false, chance: true, perigoso: true };
  }
  if (l.tipo === 'chance') {
    const perigoso =
      /trave|madeira|perigo|mano a mano|cara a cara|frente a frente|quase/.test(texto);
    if (perigoso) {
      return { peso: lerpRange(rnd, 30, 50), gol: false, chance: true, perigoso: true };
    }
    if (/posse|circula|toque|cruzamento|cruzou/.test(texto)) {
      return { peso: lerpRange(rnd, 2, 4), gol: false, chance: false, perigoso: false };
    }
    if (/escanteio|falta perigosa|bola parada|cobrança/.test(texto)) {
      return { peso: lerpRange(rnd, 8, 12), gol: false, chance: false, perigoso: false };
    }
    return { peso: lerpRange(rnd, 12, 18), gol: false, chance: true, perigoso: false };
  }
  return { peso: 0, gol: false, chance: false, perigoso: false };
}

function eventosPorMinuto(
  lancamentos: LancamentoMomento[],
  mandanteId: string,
  visitanteId: string,
  rnd: () => number,
): Map<
  number,
  {
    scoreM: number;
    scoreV: number;
    golM: boolean;
    golV: boolean;
    chanceM: boolean;
    chanceV: boolean;
    transicaoM: boolean;
    transicaoV: boolean;
  }
> {
  const map = new Map<
    number,
    {
      scoreM: number;
      scoreV: number;
      golM: boolean;
      golV: boolean;
      chanceM: boolean;
      chanceV: boolean;
      transicaoM: boolean;
      transicaoV: boolean;
    }
  >();

  const slot = (minuto: number) => {
    let s = map.get(minuto);
    if (!s) {
      s = {
        scoreM: 0,
        scoreV: 0,
        golM: false,
        golV: false,
        chanceM: false,
        chanceV: false,
        transicaoM: false,
        transicaoV: false,
      };
      map.set(minuto, s);
    }
    return s;
  };

  for (const l of lancamentos) {
    if (l.minuto < 1) continue;
    const s = slot(l.minuto);

    if (l.tipo === 'gol' || l.tipo === 'chance') {
      const casa = l.timeId === mandanteId;
      const visita = l.timeId === visitanteId;
      if (!casa && !visita) continue;
      const w = pesoEventoAtacante(l, rnd);
      if (casa) {
        s.scoreM += w.peso;
        if (w.gol) s.golM = true;
        if (w.chance) s.chanceM = true;
        if (w.perigoso) s.transicaoM = true;
      } else {
        s.scoreV += w.peso;
        if (w.gol) s.golV = true;
        if (w.chance) s.chanceV = true;
        if (w.perigoso) s.transicaoV = true;
      }
    } else if (l.tipo === 'defesa') {
      // Keeper side = defender; attacker is the other team.
      const w = pesoEventoAtacante(l, rnd);
      if (l.timeId === visitanteId) {
        s.scoreM += w.peso;
        s.chanceM = true;
        s.transicaoM = true;
      } else if (l.timeId === mandanteId) {
        s.scoreV += w.peso;
        s.chanceV = true;
        s.transicaoV = true;
      }
    }
  }

  return map;
}

function ritmoNatural(st: TeamMatchState, minuto: number, rnd: () => number): number {
  // Sine wave minute*0.25 + PhaseOffset; PhaseOffset * 12 scales phase diversity.
  const sine = Math.sin(minuto * 0.25 + st.phaseOffset * 12);
  st.noiseEma = st.noiseEma * 0.55 + (rnd() * 2 - 1) * 0.45;
  // Rt ~ 0.7–1.3 via sine + smoothed noise, then moral shift.
  const raw = 1 + sine * 0.22 + st.noiseEma * 0.18;
  return clamp(raw, 0.7, 1.3) * st.moralMult;
}

function passoEquipe(
  st: TeamMatchState,
  minuto: number,
  skillDiff: number,
  eventScore: number,
  isTransitionSpike: boolean,
  rnd: () => number,
): number {
  if (minuto > st.moralUntilMinute) {
    // Ease moral back toward 1.
    st.moralMult += (1 - st.moralMult) * 0.35;
    if (Math.abs(st.moralMult - 1) < 0.02) st.moralMult = 1;
  }

  const osc = ritmoNatural(st, minuto, rnd);
  let base = TACTIC_BASE[st.style] + skillDiff * 0.5;

  // HighPress: short spikes then fatigue drops baseline.
  if (st.style === 'HighPress') {
    base *= 1 - st.fatigue * 0.55;
    if (st.pressure > 55) st.fatigue = clamp(st.fatigue + 0.08, 0, 1);
    else st.fatigue = clamp(st.fatigue - 0.04, 0, 1);
  }

  // Counter / ParkTheBus: low floor; vertical spikes on transitions.
  let events = eventScore;
  if (st.style === 'CounterAttack' || st.style === 'ParkTheBus') {
    if (isTransitionSpike && eventScore > 0) {
      events = Math.max(eventScore, lerpRange(rnd, 70, 95));
    }
  } else if (st.style === 'HighPress' && eventScore > 25) {
    events = Math.max(eventScore, lerpRange(rnd, 80, 100));
  }

  // P(t) = P(t-1)*0.4 + BaseTactic * Osc(t) + Σ Events(t)
  st.pressure = clamp(st.pressure * DECAY_FACTOR + base * osc + events, 0, 100);
  return st.pressure;
}

function aplicarMoralGol(scorer: TeamMatchState, conceded: TeamMatchState, minuto: number) {
  scorer.moralMult = clamp(scorer.moralMult + MORAL_SCORER, 0.6, 1.45);
  scorer.moralUntilMinute = minuto + MORAL_BOOST_MINUTES;
  conceded.moralMult = clamp(conceded.moralMult + MORAL_CONCEDED, 0.6, 1.45);
  conceded.moralUntilMinute = minuto + MORAL_BOOST_MINUTES;
}

/**
 * MomentumGraphEngine (C# port): SofaScore-style attack momentum bars.
 * Bar(t) = Clamp(P_home - P_away, -100, 100)
 */
export function gerarGraficoMomentum(input: MomentumGraphInput): MomentoAtaque[] {
  const minutoFinal = input.minutoFinal ?? 90;
  const rnd = criarRng((input.seed ?? 42) ^ 0x4d4f4d45);
  const styleM = mapearEstiloTatica(input.taticaMandante);
  const styleV = mapearEstiloTatica(input.taticaVisitante);
  const home = novoEstado(styleM, rnd() * Math.PI * 2);
  const away = novoEstado(styleV, rnd() * Math.PI * 2);

  const skillDiffM = input.skillMandante - input.skillVisitante;
  const skillDiffV = -skillDiffM;

  const porMin = eventosPorMinuto(
    input.lancamentos,
    input.mandanteId,
    input.visitanteId,
    rnd,
  );

  const out: MomentoAtaque[] = [];
  for (let minuto = 1; minuto <= minutoFinal; minuto++) {
    const ev = porMin.get(minuto);
    const scoreM = ev?.scoreM ?? 0;
    const scoreV = ev?.scoreV ?? 0;

    const pM = passoEquipe(home, minuto, skillDiffM, scoreM, !!ev?.transicaoM, rnd);
    const pV = passoEquipe(away, minuto, skillDiffV, scoreV, !!ev?.transicaoV, rnd);

    if (ev?.golM) aplicarMoralGol(home, away, minuto);
    if (ev?.golV) aplicarMoralGol(away, home, minuto);

    out.push({
      minuto,
      valor: clamp(pM - pV, -100, 100),
      pressaoMandante: pM / 100,
      pressaoVisitante: pV / 100,
      golMandante: ev?.golM || undefined,
      golVisitante: ev?.golV || undefined,
      chanceMandante: ev?.chanceM || undefined,
      chanceVisitante: ev?.chanceV || undefined,
    });
  }
  return out;
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
