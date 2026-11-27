import {
  calcularAfinidadePosicional,
  type NivelAfinidade,
  type OpcoesAfinidade,
  PENA_BASE_NIVEL,
} from '../career/afinidadePosicional';
import type { Jogador, Posicao } from '../types/schema';

/**
 * Matriz legada (referência). O motor usa `calcularAfinidadePosicional`.
 * Mantida para UI/fallback quando não há Jogador completo.
 */
/** Fallback sem attrs — VOL↔MEI já em paridade (1.0). */
const MULT_LEGADO: Record<Posicao, Record<Posicao, number>> = {
  GOL: { GOL: 1, ZAG: 0.35, LAT: 0.35, VOL: 0.35, MEI: 0.35, ATA: 0.35 },
  ZAG: { GOL: 0.35, ZAG: 1, LAT: 0.89, VOL: 0.89, MEI: 0.75, ATA: 0.75 },
  LAT: { GOL: 0.35, ZAG: 0.89, LAT: 1, VOL: 0.89, MEI: 0.95, ATA: 0.89 },
  VOL: { GOL: 0.35, ZAG: 0.89, LAT: 0.89, VOL: 1, MEI: 1, ATA: 0.75 },
  MEI: { GOL: 0.35, ZAG: 0.75, LAT: 0.95, VOL: 1, MEI: 1, ATA: 0.95 },
  ATA: { GOL: 0.35, ZAG: 0.75, LAT: 0.75, VOL: 0.75, MEI: 0.95, ATA: 1 },
};

export type GrauDesvioPosicao = 'ideal' | 'secundaria' | 'improvisado' | 'muito_fora';

function nivelParaGrau(nivel: NivelAfinidade): GrauDesvioPosicao {
  if (nivel === 'natural') return 'ideal';
  if (nivel === 'alta') return 'secundaria';
  if (nivel === 'media') return 'improvisado';
  return 'muito_fora';
}

/** Fallback sem jogador — usa pena base da matriz. */
export function multiplicadorDesempenhoPosicao(
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
): number {
  if (posicaoNatural === posicaoEmCampo) return 1;
  return MULT_LEGADO[posicaoNatural][posicaoEmCampo] ?? 0.75;
}

export function grauDesvioPosicao(
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
): GrauDesvioPosicao {
  if (posicaoNatural === posicaoEmCampo) return 'ideal';
  // Aproxima o grau pela pena base da matriz (sem attrs).
  const stub = {
    posicao: posicaoNatural,
    atributos: {
      tecnicos: { dominio: 10, passe: 10, chute: 10, cabeceio: 10, drible: 10, lancamentos: 10, bola_parada: 10 },
      mentais: { leitura_jogo: 10, cobertura: 10, criatividade: 10, agressividade: 10, lideranca: 10, pressao: 10 },
      fisicos: { fora_por_lesao: 10, velocidade: 10, forca: 10 },
    },
  } as Jogador;
  const r = calcularAfinidadePosicional(stub, posicaoEmCampo);
  return nivelParaGrau(r.nivel);
}

export function rotuloGrauDesvio(grau: GrauDesvioPosicao): string {
  switch (grau) {
    case 'ideal':
      return 'Na posição';
    case 'secundaria':
      return 'Afinidade alta';
    case 'improvisado':
      return 'Afinidade média';
    case 'muito_fora':
      return 'Afinidade crítica';
  }
}

export function rotuloNivelAfinidade(nivel: NivelAfinidade): string {
  switch (nivel) {
    case 'natural':
      return 'Posição natural';
    case 'alta':
      return `Afinidade alta (−${PENA_BASE_NIVEL.alta}%)`;
    case 'media':
      return `Afinidade média (−${PENA_BASE_NIVEL.media}%)`;
    case 'critico':
      return `Afinidade crítica (−${PENA_BASE_NIVEL.critico}%)`;
    case 'gol_emergencia':
      return `GOL emergência (−${PENA_BASE_NIVEL.gol_emergencia}%)`;
  }
}

/**
 * Multiplicador de posição na partida via matriz de afinidade + modificadores.
 */
export function multiplicadorPosicaoPartidaClamp(
  jogador: Jogador,
  posicaoEmCampo: Posicao,
  opts?: OpcoesAfinidade,
): { mult: number; excecaoGrave: boolean; nivel: NivelAfinidade; afinidade: ReturnType<typeof calcularAfinidadePosicional> } {
  const afinidade = calcularAfinidadePosicional(jogador, posicaoEmCampo, opts);
  return {
    mult: afinidade.multiplicador,
    excecaoGrave: afinidade.excecaoGrave,
    nivel: afinidade.nivel,
    afinidade,
  };
}

/** OVR aproximado em campo (UI / pré-jogo) — matriz de afinidade. */
export function overallEfetivoEmCampo(
  overall: number,
  posicaoNatural: Posicao,
  posicaoEmCampo: Posicao,
  jogador?: Jogador,
): number {
  if (jogador) {
    const { mult } = multiplicadorPosicaoPartidaClamp(jogador, posicaoEmCampo);
    return Math.max(1, Math.round(overall * mult));
  }
  return Math.max(1, Math.round(overall * multiplicadorDesempenhoPosicao(posicaoNatural, posicaoEmCampo)));
}
