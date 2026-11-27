import type { Jogador } from '../types/schema';
import type { ResultadoColetiva } from './pressConferenceEngine';

export const MORAL_PADRAO = 50;
export const MORAL_MIN = 0;
export const MORAL_MAX = 100;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function moralDe(jogador: Jogador): number {
  return jogador.moral ?? MORAL_PADRAO;
}

/**
 * Aplica deltas da coletiva: alvo recebe deltaMoralJogador; demais do clube recebem deltaMoralElenco.
 * Ambos clampados em 0–100.
 */
export function aplicarDeltasMoralColetiva(
  jogadores: Jogador[],
  clubeId: string,
  alvoId: number,
  resultado: Pick<ResultadoColetiva, 'deltaMoralJogador' | 'deltaMoralElenco'>,
): Jogador[] {
  const dJ = resultado.deltaMoralJogador;
  const dE = resultado.deltaMoralElenco;
  if (dJ === 0 && dE === 0) {
    return jogadores.map((j) =>
      j.time_id === clubeId && j.moral == null ? { ...j, moral: MORAL_PADRAO } : j,
    );
  }
  return jogadores.map((j) => {
    if (j.time_id !== clubeId) return j;
    const base = moralDe(j);
    if (j.id === alvoId) {
      return { ...j, moral: clamp(base + dJ, MORAL_MIN, MORAL_MAX) };
    }
    return { ...j, moral: clamp(base + dE, MORAL_MIN, MORAL_MAX) };
  });
}

/** Multiplicador ~0.94–1.06 a partir da moral média do elenco (para fatorMoralTime). */
export function fatorMoralMedioElenco(elenco: Jogador[]): number {
  if (!elenco.length) return 1;
  const media = elenco.reduce((acc, j) => acc + moralDe(j), 0) / elenco.length;
  // 50 → 1.00; 0 → 0.94; 100 → 1.06
  return clamp(1 + ((media - MORAL_PADRAO) / 50) * 0.06, 0.94, 1.06);
}
