import type { CelulaGrade } from '../data/gradeCampinho';
import { posicaoNaCelula } from '../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../data/esquemasTaticos';
import { montarEscalacao, type JogadorEmCampo } from '../engine/matchEngine';
import type { EsquemaTatico, Jogador } from '../types/schema';
import {
  jogadorPodeJogar,
  sanitizarAlinhamento11,
} from './aptidaoEscalacao';

export function idsEscalacaoPadrao(elenco: Jogador[], esquema: EsquemaTatico): number[] {
  try {
    return montarEscalacao(elenco, esquema).map((e) => e.jogador.id);
  } catch {
    return elenco.filter(jogadorPodeJogar).slice(0, 11).map((j) => j.id);
  }
}

export function escalacaoDeIds(
  elenco: Jogador[],
  esquema: EsquemaTatico,
  ids: number[],
  grade?: CelulaGrade[] | null,
): JogadorEmCampo[] {
  const { ids: idsLimpos } = sanitizarAlinhamento11(elenco, ids);
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const map = new Map(elenco.map((j) => [j.id, j]));
  const lista: JogadorEmCampo[] = [];
  for (let i = 0; i < Math.min(11, idsLimpos.length); i++) {
    const jogador = map.get(idsLimpos[i]!);
    if (!jogador || !jogadorPodeJogar(jogador)) continue;
    const posicaoEscalada =
      grade?.[i] != null ? posicaoNaCelula(grade[i]!) : (slots[i] ?? jogador.posicao);
    lista.push({
      jogador,
      posicaoEscalada,
      ...(grade?.[i] != null ? { celulaCampo: grade[i] } : {}),
    });
  }
  return lista.length >= 11 ? lista : montarEscalacao(elenco, esquema);
}