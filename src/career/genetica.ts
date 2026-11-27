import type { GeneticaJogador, Jogador, Posicao } from '../types/schema';

/** Gera genética para joias da base (integra com campo opcional em Jogador). */
export function gerarGeneticaBase(params: {
  overall: number;
  potencialOvr: number;
  idade: number;
  precoceEstagnado: boolean;
  diamanteBruto: boolean;
  bonusAttrs: number;
  seed: number;
  rnd: () => number;
}): GeneticaJogador {
  const { overall, potencialOvr, precoceEstagnado, diamanteBruto, bonusAttrs, rnd } = params;
  let potencial_maximo = Math.max(overall, potencialOvr);
  if (precoceEstagnado) {
    potencial_maximo = Math.min(potencial_maximo, overall + 2 + Math.floor(rnd() * 3));
  }
  if (diamanteBruto) {
    potencial_maximo = Math.max(potencial_maximo, overall + 12 + Math.floor(rnd() * 8));
  }

  let fator_absorcao = Number((0.85 + rnd() * 0.45).toFixed(2));
  if (diamanteBruto) fator_absorcao = Number((1.15 + rnd() * 0.28).toFixed(2));
  if (precoceEstagnado) fator_absorcao = Number((0.65 + rnd() * 0.22).toFixed(2));

  let propensao_lesao = Number((0.78 + rnd() * 0.5).toFixed(2));
  // CT Base elite / bônus de staff → propensão ↓
  if (bonusAttrs >= 3) {
    propensao_lesao = Number(Math.max(0.5, propensao_lesao - 0.18 - bonusAttrs * 0.02).toFixed(2));
  }

  let perfil_scout = 'Resposta física e evolução dentro da média da base.';
  if (precoceEstagnado) {
    perfil_scout = 'Falso precoce: brilha cedo, mas o teto técnico é limitado.';
  } else if (diamanteBruto) {
    perfil_scout = 'Diamante bruto: ainda cru, teto alto se receber minutos e treino.';
  } else if (potencial_maximo >= 85) {
    perfil_scout = 'Joia com teto de elite; absorve carga e evolui rápido.';
  } else if (propensao_lesao <= 0.7) {
    perfil_scout = 'Constituição privilegiada; suporte a carga elevada.';
  }

  return { potencial_maximo, fator_absorcao, propensao_lesao, perfil_scout };
}

export function tetoPotencialJogador(j: Jogador): number {
  if (j.genetica?.potencial_maximo != null) return j.genetica.potencial_maximo;
  if (j.formacaoBase?.potencialOvr != null) return j.formacaoBase.potencialOvr;
  return j.overall + (j.idade <= 21 ? 8 : 3);
}

export function fatorAbsorcaoJogador(j: Jogador): number {
  return j.genetica?.fator_absorcao ?? 1;
}

export function propensaoLesaoJogador(j: Jogador): number {
  return j.genetica?.propensao_lesao ?? 1;
}

/** Posições ofensivas/criativas preferidas no foco vender. */
export const POSICOES_LIQUIDEZ: Posicao[] = ['ATA', 'MEI', 'LAT'];

export const POSICOES_TODAS: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
