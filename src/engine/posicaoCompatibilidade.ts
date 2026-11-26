import type { Posicao } from '../types/schema';

/**
 * Multiplicador de rendimento (1 = posição natural). Valores baixos = muito fora de posição.
 * Tabela simétrica — pensada para o eixo defesa → meio → ataque.
 */
const MULT: Record<Posicao, Record<Posicao, number>> = {
  GOL: {
    GOL: 1,
    ZAG: 0.22,
    LAT: 0.2,
    VOL: 0.18,
    MEI: 0.16,
    ATA: 0.14,
  },
  ZAG: {
    GOL: 0.2,
    ZAG: 1,
    LAT: 0.93,
    VOL: 0.82,
    MEI: 0.62,
    ATA: 0.42,
  },
  LAT: {
    GOL: 0.18,
    ZAG: 0.93,
    LAT: 1,
    VOL: 0.88,
    MEI: 0.7,
    ATA: 0.52,
  },
  VOL: {
    GOL: 0.16,
    ZAG: 0.82,
    LAT: 0.88,
    VOL: 1,
    MEI: 0.9,
    ATA: 0.66,
  },
  MEI: {
    GOL: 0.14,
    ZAG: 0.58,
    LAT: 0.68,
    VOL: 0.9,
    MEI: 1,
    ATA: 0.86,
  },
  ATA: {
    GOL: 0.12,
    ZAG: 0.4,
    LAT: 0.5,
    VOL: 0.64,
    MEI: 0.86,
    ATA: 1,
  },
};

export type GrauDesvioPosicao = 'ideal' | 'secundaria' | 'improvisado' | 'muito_fora';

export function multiplicadorDesempenhoPosicao(
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
): number {
  return MULT[posicaoNatural][posicaoEmCampo] ?? 0.5;
}

export function grauDesvioPosicao(
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
): GrauDesvioPosicao {
  const m = multiplicadorDesempenhoPosicao(posicaoNatural, posicaoEmCampo);
  if (m >= 0.98) return 'ideal';
  if (m >= 0.86) return 'secundaria';
  if (m >= 0.68) return 'improvisado';
  return 'muito_fora';
}

export function rotuloGrauDesvio(grau: GrauDesvioPosicao): string {
  switch (grau) {
    case 'ideal':
      return 'Na posição';
    case 'secundaria':
      return 'Posição adaptável';
    case 'improvisado':
      return 'Fora de posição';
    case 'muito_fora':
      return 'Muito fora de posição';
  }
}

/** OVR aproximado em campo (só para UI / pré-jogo). */
export function overallEfetivoEmCampo(
  overall: number,
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
): number {
  return Math.max(1, Math.round(overall * multiplicadorDesempenhoPosicao(posicaoNatural, posicaoEmCampo)));
}