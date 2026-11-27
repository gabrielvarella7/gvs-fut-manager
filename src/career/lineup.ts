import type { CelulaGrade } from '../data/gradeCampinho';
import { posicaoNaCelula } from '../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../data/esquemasTaticos';
import { montarEscalacao, type JogadorEmCampo } from '../engine/matchEngine';
import { PositionRecalculator } from './positionRecalculator';
import type { EsquemaTatico, Jogador } from '../types/schema';

/** Recalcula nativas/adaptadas da matriz (Gabriel) no elenco. */
export function enriquecerElencoAfinidade(elenco: Jogador[]): Jogador[] {
  return PositionRecalculator.processarElenco(elenco);
}

export function idsEscalacaoPadrao(elenco: Jogador[], esquema: EsquemaTatico): number[] {
  try {
    return montarEscalacao(enriquecerElencoAfinidade(elenco), esquema).map((e) => e.jogador.id);
  } catch {
    return elenco.slice(0, 11).map((j) => j.id);
  }
}

export function escalacaoDeIds(
  elenco: Jogador[],
  esquema: EsquemaTatico,
  ids: number[],
  grade?: CelulaGrade[] | null,
): JogadorEmCampo[] {
  const elencoAf = enriquecerElencoAfinidade(elenco);
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const map = new Map(elencoAf.map((j) => [j.id, j]));
  const lista: JogadorEmCampo[] = [];
  for (let i = 0; i < Math.min(11, ids.length); i++) {
    const jogador = map.get(ids[i]);
    if (!jogador) continue;
    const posicaoEscalada =
      grade?.[i] != null ? posicaoNaCelula(grade[i]) : (slots[i] ?? jogador.posicao);
    lista.push({
      jogador,
      posicaoEscalada,
      ...(grade?.[i] != null ? { celulaCampo: grade[i] } : {}),
    });
  }
  return lista.length >= 11 ? lista : montarEscalacao(elencoAf, esquema);
}