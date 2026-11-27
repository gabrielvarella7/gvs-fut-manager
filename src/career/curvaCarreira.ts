import type { Posicao } from '../types/schema';
import type { Jogador } from '../types/schema';
import type { PlanoIndividualId } from '../types/training';

/** Genética opcional (compatível com PR de DM/fisiologia). */
export interface GeneticaLongevidade {
  propensao_lesao?: number;
  potencial_maximo?: number;
  fator_absorcao?: number;
}

export interface AugePosicao {
  augeMin: number;
  augeMax: number;
  /** Idade até a qual o declínio ainda é brando. */
  altoAte: number;
  /** Deslocamento na idade efetiva de declínio (negativo = vive mais). */
  deslocamentoAnos: number;
}

/**
 * GOL auge 26–35 alto até 40–43; ZAG/VOL 25–32 até 36–38;
 * MEI 24–32 até 35–37; LAT/ATA auge 22–28, declínio ~30–31.
 */
export const AUGE_POR_POSICAO: Record<Posicao, AugePosicao> = {
  GOL: { augeMin: 26, augeMax: 35, altoAte: 41, deslocamentoAnos: -3 },
  ZAG: { augeMin: 25, augeMax: 32, altoAte: 37, deslocamentoAnos: -1.5 },
  VOL: { augeMin: 25, augeMax: 32, altoAte: 37, deslocamentoAnos: -1.5 },
  MEI: { augeMin: 24, augeMax: 32, altoAte: 36, deslocamentoAnos: -0.5 },
  LAT: { augeMin: 22, augeMax: 28, altoAte: 31, deslocamentoAnos: 1.5 },
  ATA: { augeMin: 22, augeMax: 28, altoAte: 31, deslocamentoAnos: 1.5 },
};

/** Faixas de XP / regressão alinhadas ao spec (midpoints). */
export interface FaixaCurvaCarreira {
  idadeMin: number;
  idadeMax: number;
  xpMultMin: number;
  xpMultMax: number;
  /** Taxa base mensal de regressão (antes de longevidade). */
  taxaRegressaoMensal: number;
}

export const CURVA_IDADE_CARREIRA: FaixaCurvaCarreira[] = [
  { idadeMin: 16, idadeMax: 19, xpMultMin: 2.2, xpMultMax: 2.5, taxaRegressaoMensal: 0 },
  { idadeMin: 20, idadeMax: 23, xpMultMin: 1.5, xpMultMax: 1.9, taxaRegressaoMensal: 0 },
  { idadeMin: 24, idadeMax: 29, xpMultMin: 0.65, xpMultMax: 1.1, taxaRegressaoMensal: 0 },
  { idadeMin: 30, idadeMax: 32, xpMultMin: 0.25, xpMultMax: 0.25, taxaRegressaoMensal: 0.12 },
  { idadeMin: 33, idadeMax: 35, xpMultMin: 0.08, xpMultMax: 0.08, taxaRegressaoMensal: 0.28 },
  { idadeMin: 36, idadeMax: 39, xpMultMin: 0, xpMultMax: 0, taxaRegressaoMensal: 0.4 },
  { idadeMin: 40, idadeMax: 55, xpMultMin: 0, xpMultMax: 0, taxaRegressaoMensal: 0.55 },
];

export function faixaCurvaPorIdade(idade: number): FaixaCurvaCarreira {
  return (
    CURVA_IDADE_CARREIRA.find((f) => idade >= f.idadeMin && idade <= f.idadeMax) ??
    CURVA_IDADE_CARREIRA[CURVA_IDADE_CARREIRA.length - 1]!
  );
}

/** Multiplicador de XP etário (midpoint da faixa; jitter opcional). */
export function multiplicadorXpEtario(idade: number, rnd?: () => number): number {
  const f = faixaCurvaPorIdade(idade);
  if (f.xpMultMin === f.xpMultMax) return f.xpMultMin;
  if (!rnd) return (f.xpMultMin + f.xpMultMax) / 2;
  return f.xpMultMin + rnd() * (f.xpMultMax - f.xpMultMin);
}

export function propensaoLesaoDe(jogador: Jogador): number {
  const g = (jogador as Jogador & { genetica?: GeneticaLongevidade }).genetica;
  const p = g?.propensao_lesao;
  return typeof p === 'number' && Number.isFinite(p) ? p : 1;
}

export function temCicatrizFisica(jogador: Jogador): boolean {
  return (jogador as Jogador & { cicatrizFisica?: boolean }).cicatrizFisica === true;
}

/**
 * Longevidade:
 * propensão ≤0,75 → −50% regressão; ≥1,60 → declínio 2–3 anos mais cedo;
 * staff elite → +2,5 anos; cicatriz → regressão ↑;
 * MANUTENCAO_VETERANO 31+ → −60% regressão mensal.
 */
export function anosBonusLongevidade(params: {
  propensaoLesao: number;
  nivelStaffElite?: number;
  cicatriz?: boolean;
}): number {
  let anos = 0;
  if (params.propensaoLesao >= 1.6) {
    anos -= 2 + Math.min(1, (params.propensaoLesao - 1.6) / 0.6); // −2…−3
  }
  const staff = params.nivelStaffElite ?? 10;
  if (staff >= 18) anos += 2.5;
  else if (staff >= 15) anos += 1.2;
  if (params.cicatriz) anos -= 1;
  return anos;
}

/** Idade efetiva para curva de declínio (posição + genética + staff). */
export function idadeEfetivaDeclinio(
  idade: number,
  posicao: Posicao,
  opts: { propensaoLesao?: number; nivelStaffElite?: number; cicatriz?: boolean } = {},
): number {
  const auge = AUGE_POR_POSICAO[posicao];
  const bonus = anosBonusLongevidade({
    propensaoLesao: opts.propensaoLesao ?? 1,
    nivelStaffElite: opts.nivelStaffElite,
    cicatriz: opts.cicatriz,
  });
  return idade + auge.deslocamentoAnos - bonus;
}

/**
 * Fator multiplicativo sobre taxa_regressao_mensal.
 * MANUTENCAO 31+: 0,4 (−60%). Propensão baixa: 0,5. Cicatriz: 1,25.
 */
export function fatorRegressaoLongevidade(params: {
  idade: number;
  propensaoLesao: number;
  planoId?: PlanoIndividualId;
  cicatriz?: boolean;
}): number {
  let f = 1;
  if (params.propensaoLesao <= 0.75) f *= 0.5;
  else if (params.propensaoLesao >= 1.6) f *= 1.2;
  if (params.cicatriz) f *= 1.25;
  if (params.planoId === 'MANUTENCAO_VETERANO' && params.idade >= 31) {
    f *= 0.4;
  }
  return f;
}

/** Taxa mensal efetiva após posição/longevidade. */
export function taxaRegressaoMensalEfetiva(params: {
  idade: number;
  posicao: Posicao;
  propensaoLesao?: number;
  nivelStaffElite?: number;
  planoId?: PlanoIndividualId;
  cicatriz?: boolean;
}): number {
  const idadeEff = idadeEfetivaDeclinio(params.idade, params.posicao, {
    propensaoLesao: params.propensaoLesao,
    nivelStaffElite: params.nivelStaffElite,
    cicatriz: params.cicatriz,
  });
  const faixa = faixaCurvaPorIdade(Math.round(idadeEff));
  const fator = fatorRegressaoLongevidade({
    idade: params.idade,
    propensaoLesao: params.propensaoLesao ?? 1,
    planoId: params.planoId,
    cicatriz: params.cicatriz,
  });
  return faixa.taxaRegressaoMensal * fator;
}

/**
 * Delta estrutural sugerido no fim da temporada (antes de teto).
 * 55+ jogos → −2 OVR; 35–40 → estável (carga neutra).
 */
export function ajusteCargaTemporada(jogos: number): number {
  if (jogos >= 55) return -2;
  if (jogos >= 35 && jogos <= 40) return 0;
  if (jogos < 12) return -0.5;
  return 0;
}

/** Curva etária de progresso sazonal (OVR/atributos), modulada por posição. */
export function curvaIdadeSazonal(idade: number, posicao: Posicao): number {
  const idadeEff = idadeEfetivaDeclinio(idade, posicao);
  if (idadeEff <= 19) return 2.4;
  if (idadeEff <= 23) return 1.5;
  if (idadeEff <= 29) return 0.35;
  if (idadeEff <= 32) return -0.5;
  if (idadeEff <= 35) return -1.5;
  if (idadeEff <= 39) return -2.5;
  return -3.5;
}

/** +2% leitura em jogos decisivos para 30–32 (early veteran savvy). */
export function bonusLeituraVeterano(idade: number): number {
  if (idade >= 30 && idade <= 32) return 0.02;
  return 0;
}
