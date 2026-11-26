import { calcularFatorMoral, type ContextoDinamicoPartida } from './matchContext';
import type { JogadorEmCampo, ProbabilidadesResultado } from './matchEngine';

/** Oscilação máxima (pontos de índice) no confronto antes do placar. */
export const VARIANCE_OVR_MAX = 11;

/** Equivalente em OVR no índice do mandante (não multiplica o time inteiro). */
export const BONUS_CASA_OVR = 2.2;

export interface CruzamentoPartida {
  mediaOvrM: number;
  mediaOvrV: number;
  momentoM: number;
  momentoV: number;
  indiceM: number;
  indiceV: number;
  diff: number;
}

export function mediaOvrEscalacao(esc: JogadorEmCampo[]): number {
  if (esc.length === 0) return 68;
  return esc.reduce((s, e) => s + e.jogador.overall, 0) / esc.length;
}

export function momentoTime(
  contexto: ContextoDinamicoPartida | undefined,
  mandante: boolean,
): number {
  const hist = mandante
    ? contexto?.ultimosResultadosMandante
    : contexto?.ultimosResultadosVisitante;
  return calcularFatorMoral(hist ?? []).multiplicador;
}

/**
 * Compara os 22 titulares: média OVR × momento.
 * Casa entra como pontos fixos (não % em cima do elenco — evita 81% em jogos equilibrados).
 * `penM/penV` não entram aqui — desfalque já está no XI; só afeta variância na simulação.
 */
export function cruzar22Titulares(
  escalacaoM: JogadorEmCampo[],
  escalacaoV: JogadorEmCampo[],
  bonusMando: number,
  contexto: ContextoDinamicoPartida | undefined,
): CruzamentoPartida {
  const mediaOvrM = mediaOvrEscalacao(escalacaoM);
  const mediaOvrV = mediaOvrEscalacao(escalacaoV);
  const momentoM = momentoTime(contexto, true);
  const momentoV = momentoTime(contexto, false);
  const casaOvr =
    bonusMando > 1.01 ? BONUS_CASA_OVR * Math.min(1.15, (bonusMando - 1) / 0.05) : 0;
  const indiceM = mediaOvrM * momentoM + casaOvr;
  const indiceV = mediaOvrV * momentoV;
  return {
    mediaOvrM,
    mediaOvrV,
    momentoM,
    momentoV,
    indiceM,
    indiceV,
    diff: indiceM - indiceV,
  };
}

/** Quanto mais equilibrado o duelo, maior a variância do resultado. */
export function amplitudeVariancia(diff: number): number {
  return Math.max(0.32, 1 - Math.abs(diff) / 28);
}

export function sortearDiffComVariancia(diff: number, rnd: () => number): number {
  const amp = amplitudeVariancia(diff);
  const jitter = (rnd() * 2 - 1) * VARIANCE_OVR_MAX * amp;
  return diff + jitter;
}

/** Probabilidades 1X2 no centro da faixa (sem sorteio do dia). */
export function probabilidadesDeDiff(diff: number): ProbabilidadesResultado {
  const escala = 11.5;
  const expo = Math.max(-2.6, Math.min(2.6, diff / escala));
  let pM = 1 / (1 + Math.exp(-expo));
  let pV = 1 / (1 + Math.exp(expo));
  let pE =
    0.2 +
    0.12 * Math.exp(-Math.abs(diff) / 9) +
    (Math.abs(diff) < 4 ? 0.08 : 0);

  const soma = pM + pV + pE;
  pM /= soma;
  pV /= soma;
  pE /= soma;

  const piso = 0.12;
  pM = Math.max(piso, Math.min(0.72, pM));
  pV = Math.max(piso, Math.min(0.72, pV));
  pE = Math.max(0.14, Math.min(0.38, pE));
  const t = pM + pV + pE;
  return {
    vitoriaMandante: pM / t,
    empate: pE / t,
    vitoriaVisitante: pV / t,
  };
}

export function lambdasGolsDeDiff(diff: number): { lambdaM: number; lambdaV: number } {
  const base = 1.08;
  const tilt = diff / 26;
  return {
    lambdaM: Math.max(0.15, Math.min(3.6, base + tilt)),
    lambdaV: Math.max(0.15, Math.min(3.6, base - tilt * 0.92)),
  };
}

/** Resultado raro (~1 a cada 30 jogos): goleada fora do script. */
export function placarJogoAlucinado(
  diff: number,
  rnd: () => number,
): { golsMandante: number; golsVisitante: number } {
  const mandanteFavorito = diff > 2;
  const visitanteFavorito = diff < -2;
  const todas: [number, number][] = [
    [2, 5],
    [1, 5],
    [2, 4],
    [3, 5],
    [0, 4],
    [1, 4],
    [5, 2],
    [4, 1],
    [5, 1],
    [4, 2],
    [3, 4],
    [4, 3],
  ];
  let pool = todas;
  if (mandanteFavorito) {
    pool = todas.filter(([m, v]) => v >= m + 2);
  } else if (visitanteFavorito) {
    pool = todas.filter(([m, v]) => m <= v - 2);
  }
  if (pool.length === 0) pool = todas;
  const [gM, gV] = pool[Math.floor(rnd() * pool.length)]!;
  return { golsMandante: gM, golsVisitante: gV };
}

export function indicePartidaDeveSerAlucinado(indicePartidaTemporada?: number): boolean {
  if (!indicePartidaTemporada || indicePartidaTemporada < 1) return false;
  return indicePartidaTemporada % 30 === 0;
}