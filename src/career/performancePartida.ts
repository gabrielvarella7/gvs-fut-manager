import type { Jogador } from '../types/schema';

/** Piso da soma cansaço+moral+pressão (−12%). */
export const PISO_CIRCUNSTANCIAL = 0.88;
/** Piso do multiplicador total em partida (salvo exceção grave). */
export const PISO_PERFORMANCE_TOTAL = 0.88;
/** Improvisação de setor isolada: no máximo −15%. */
export const PISO_IMPROVISACAO_SETOR = 0.85;
/** Forma saudável em posição natural: −4% … +6%. */
export const FORMA_NATURAL_MIN = 0.96;
export const FORMA_NATURAL_MAX = 1.06;

/**
 * Fadiga → multiplicador de rendimento (curto prazo).
 * 80–100: 0 · 65–79: −2%…−5% · &lt;65: máx −9% (nunca −18%).
 */
export function multiplicadorFadigaPartida(energia: number): number {
  const e = Math.max(0, Math.min(100, energia));
  if (e >= 80) return 1;
  if (e >= 65) {
    const t = (79 - e) / Math.max(1, 79 - 65);
    const pen = 0.02 + Math.max(0, Math.min(1, t)) * 0.03;
    return 1 - pen;
  }
  // &lt;65: continua de −5% até −9%
  const t = Math.min(1, (65 - e) / 65);
  const pen = 0.05 + t * 0.04;
  return Math.max(0.91, 1 - pen);
}

/**
 * Soma circunstancial (cansaço + moral + pressão/motivação).
 * Penalidade combinada ≤ −12%; bônus limitado (+6%).
 */
export function combinarCircunstanciais(
  fadiga: number,
  moral: number,
  pressaoOuMotivacao: number,
): number {
  const bruto = 1 + (fadiga - 1) + (moral - 1) + (pressaoOuMotivacao - 1);
  return Math.max(PISO_CIRCUNSTANCIAL, Math.min(FORMA_NATURAL_MAX, bruto));
}

export interface ParametrosPerformancePartida {
  overallBase: number;
  energia: number;
  /** Já resolvido (com clamp de setor / exceção grave). */
  multPosicao: number;
  excecaoGrave?: boolean;
  posicaoNatural: boolean;
  fatorMotivacao?: number;
  fatorMoralTime?: number;
  /** Idade — jovens 16–19 oscilam ±4% na forma. */
  idade?: number;
  /** 0–1 estável; se omitido, sem jitter extra. */
  formaJitter01?: number;
}

export interface ResultadoPerformancePartida {
  /** overall permanente (não alterado por cansaço/moral). */
  overallBase: number;
  /** Multiplicador curto de partida (já clampado). */
  performanceMult: number;
  /** OVR aparente só nesta partida. */
  overallEfetivo: number;
  excecaoGrave: boolean;
}

/**
 * Separa overall_base (estrutural) de performance_partida (modificadores curtos com clamp).
 * Nunca altera atributos permanentes.
 */
export function calcularPerformancePartida(
  p: ParametrosPerformancePartida,
): ResultadoPerformancePartida {
  const fadiga = multiplicadorFadigaPartida(p.energia);
  const moral = p.fatorMoralTime ?? 1;
  const motiv = p.fatorMotivacao ?? 1;
  let circ = combinarCircunstanciais(fadiga, moral, motiv);
  const excecaoGrave = p.excecaoGrave === true;

  // Saudável + posição natural: banda −4%…+6% do OVR base.
  if (p.energia > 75 && p.posicaoNatural && !excecaoGrave) {
    circ = Math.max(FORMA_NATURAL_MIN, Math.min(FORMA_NATURAL_MAX, circ));
  }

  // Jovens 16–19: oscilação de forma ±4%.
  let oscilacao = 1;
  if (p.idade != null && p.idade >= 16 && p.idade <= 19 && p.formaJitter01 != null) {
    oscilacao = 0.96 + p.formaJitter01 * 0.08;
  }

  let mult = circ * p.multPosicao * oscilacao;
  if (!excecaoGrave) {
    mult = Math.max(PISO_PERFORMANCE_TOTAL, mult);
  }

  const overallBase = Math.max(1, p.overallBase);
  return {
    overallBase,
    performanceMult: mult,
    overallEfetivo: Math.max(1, Math.round(overallBase * mult)),
    excecaoGrave,
  };
}

/** overall_base estrutural — só muda por XP / declínio sazonal. */
export function overallBaseDe(jogador: Jogador): number {
  return jogador.overall;
}

/** OVR de UI / pré-jogo a partir só da energia (moral neutra, posição natural). */
export function overallEfetivoPorEnergiaBase(overallBase: number, energia: number): number {
  const r = calcularPerformancePartida({
    overallBase,
    energia,
    multPosicao: 1,
    posicaoNatural: true,
  });
  return r.overallEfetivo;
}
