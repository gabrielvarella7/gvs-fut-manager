import { metricasMotorDeAtributos } from '../career/atributosJogador';
import { calcularFatorMoral, type ContextoDinamicoPartida, type ContextoNecessidade } from './matchContext';
import {
  cruzar22Titulares,
  cruzarQuemVencera,
  probabilidadesDeDiff,
  type CruzamentoPartida,
} from './matchResultadoCore';
import type { ForcaSetores, JogadorEmCampo } from './matchEngine';

function forcaGlobalSetores(f: ForcaSetores): number {
  return f.defesa * 0.28 + f.meio * 0.34 + f.ataque * 0.38;
}
import type { Jogador, Time } from '../types/schema';

export interface ProbabilidadesResultado {
  vitoriaMandante: number;
  empate: number;
  vitoriaVisitante: number;
}

export interface FaixaProbabilidades {
  probabilidades: ProbabilidadesResultado;
  forcaMandante: number;
  forcaVisitante: number;
  variacaoDiaMandante: number;
  variacaoDiaVisitante: number;
  motivacaoMandante: number;
  motivacaoVisitante: number;
  penalidadeDesfalqueMandante: number;
  penalidadeDesfalqueVisitante: number;
  cruzamento: CruzamentoPartida;
}

export interface ParametrosPreparacaoTime {
  timeId: string;
  forcaInstitucional: number;
  escalacao: JogadorEmCampo[];
  elenco: Jogador[];
  setores: ForcaSetores;
  contexto?: ContextoDinamicoPartida;
  ladoMandante: boolean;
}

function forcaInstitucionalDeTime(time?: Pick<Time, 'forca_geral' | 'prestigio'>): number {
  if (!time) return 72;
  return Math.max(48, Math.min(96, time.prestigio ?? time.forca_geral));
}

export function forcaInstitucionalTime(time?: Pick<Time, 'forca_geral' | 'prestigio'>): number {
  return forcaInstitucionalDeTime(time);
}

function mediaLiderancaPressao(esc: JogadorEmCampo[]): { lideranca: number; pressao: number } {
  if (esc.length === 0) return { lideranca: 50, pressao: 50 };
  let l = 0;
  let p = 0;
  for (const { jogador } of esc) {
    const m = metricasMotorDeAtributos(jogador.atributos);
    l += m.lideranca;
    p += m.pressao;
  }
  const n = esc.length;
  return { lideranca: l / n, pressao: p / n };
}

function fatorMotivacaoTime(
  esc: JogadorEmCampo[],
  contexto: ContextoDinamicoPartida | undefined,
  ladoMandante: boolean,
): number {
  const historico = ladoMandante
    ? contexto?.ultimosResultadosMandante
    : contexto?.ultimosResultadosVisitante;
  const moral = calcularFatorMoral(historico ?? []).multiplicador;
  const { lideranca, pressao } = mediaLiderancaPressao(esc);
  const necessidade: ContextoNecessidade | undefined = ladoMandante
    ? contexto?.necessidadeMandante
    : contexto?.necessidadeVisitante;

  let ctx = 1;
  if (necessidade === 'DESESPERO_REBAIXAMENTO') ctx = 1.04;
  else if (necessidade === 'DECISIVO_TITULO') ctx = 1.03;
  else if (necessidade === 'CUMPRINDO_TABELA') ctx = 0.94;

  const lider = 0.94 + (lideranca / 100) * 0.1;
  const clutch = necessidade === 'DECISIVO_TITULO' ? 0.96 + (pressao / 100) * 0.08 : 1;

  return Math.max(0.82, Math.min(1.1, moral * lider * ctx * clutch));
}

/** Compara OVR médio do XI atual vs XI automático ideal (desfalques improvisados). */
export function penalidadeDesfalque(
  escalacao: JogadorEmCampo[],
  elenco: Jogador[],
): number {
  if (elenco.length < 11 || escalacao.length < 11) return 1;
  const idealOvr =
    [...elenco]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 11)
      .reduce((s, j) => s + j.overall, 0) / 11;
  const atualOvr =
    escalacao.reduce((s, e) => s + e.jogador.overall, 0) / escalacao.length;

  let pen = Math.max(0.68, Math.min(1.05, atualOvr / Math.max(idealOvr, 50)));

  const cansados = escalacao.filter((e) => e.jogador.energia < 48).length;
  pen *= Math.max(0.75, 1 - cansados * 0.045);

  const foraPos = escalacao.filter(
    (e) => e.jogador.posicao !== e.posicaoEscalada,
  ).length;
  pen *= Math.max(0.78, 1 - foraPos * 0.028);

  return pen;
}

function forcaCombinada(
  setores: ForcaSetores,
  institucional: number,
  motivacao: number,
  desfalque: number,
  variacaoDia: number,
  expulsos: number,
): number {
  const campo = forcaGlobalSetores(setores);
  const estrutural = institucional * 0.92 + campo * 0.08;
  const pesoInst = 0.38;
  const pesoCampo = 0.62;
  const mista = estrutural * pesoInst + campo * pesoCampo;
  const exp = Math.pow(0.84, expulsos);
  return mista * motivacao * desfalque * variacaoDia * exp;
}

function sortearVariacaoDia(rnd: () => number, motivacao: number, desfalque: number): number {
  const amplitude = 0.06 + (1 - motivacao) * 0.05 + (1 - desfalque) * 0.07;
  const delta = (rnd() * 2 - 1) * amplitude;
  return Math.max(0.78, Math.min(1.14, 1 + delta));
}

/** Probabilidades 1X2 a partir do cruzamento OVR×momento (sem sorteio do dia). */
export function probabilidadesComFaixa(
  _forcaM: number,
  _forcaV: number,
  _instM: number,
  _instV: number,
  cruzamento?: CruzamentoPartida,
): ProbabilidadesResultado {
  if (cruzamento) return probabilidadesDeDiff(cruzamento.diff);
  return probabilidadesDeDiff(_forcaM - _forcaV);
}

export function prepararPartidaComFaixa(
  mandante: ParametrosPreparacaoTime,
  visitante: ParametrosPreparacaoTime,
  rnd: () => number,
  expulsosMandante = 0,
  expulsosVisitante = 0,
  bonusMando = 1.05,
): FaixaProbabilidades {
  const motM = fatorMotivacaoTime(mandante.escalacao, mandante.contexto, true);
  const motV = fatorMotivacaoTime(visitante.escalacao, visitante.contexto, false);
  const desM = penalidadeDesfalque(mandante.escalacao, mandante.elenco);
  const desV = penalidadeDesfalque(visitante.escalacao, visitante.elenco);

  const varM = sortearVariacaoDia(rnd, motM, desM);
  const varV = sortearVariacaoDia(rnd, motV, desV);

  const contexto = mandante.contexto ?? visitante.contexto;

  /** Força da simulação: XI do dia (pode mudar com tática). */
  const cruzamento = cruzar22Titulares(
    mandante.escalacao,
    visitante.escalacao,
    bonusMando,
    contexto,
  );

  /**
   * Pills “Quem vencerá?”: elenco (top 22) + forma campeonato + forma recente + mando.
   * Não usa escalação/tática — permanece estável no pré-jogo e no ao vivo.
   */
  const cruzamentoEnquete = cruzarQuemVencera(
    mandante.elenco,
    visitante.elenco,
    bonusMando,
    contexto,
  );

  const forcaM = forcaCombinada(
    mandante.setores,
    mandante.forcaInstitucional,
    motM,
    desM,
    varM,
    expulsosMandante,
  );
  const forcaV = forcaCombinada(
    visitante.setores,
    visitante.forcaInstitucional,
    motV,
    desV,
    varV,
    expulsosVisitante,
  );

  const probabilidades = probabilidadesComFaixa(
    forcaM,
    forcaV,
    mandante.forcaInstitucional,
    visitante.forcaInstitucional,
    cruzamentoEnquete,
  );

  return {
    probabilidades,
    forcaMandante: cruzamento.indiceM,
    forcaVisitante: cruzamento.indiceV,
    variacaoDiaMandante: varM,
    variacaoDiaVisitante: varV,
    motivacaoMandante: motM,
    motivacaoVisitante: motV,
    penalidadeDesfalqueMandante: desM,
    penalidadeDesfalqueVisitante: desV,
    cruzamento,
  };
}

/** Versão legada — delega à faixa quando não há dados institucionais. */
export function probabilidadesResultado(forcaM: number, forcaV: number): ProbabilidadesResultado {
  const instM = forcaM * 0.94;
  const instV = forcaV * 0.94;
  return probabilidadesComFaixa(forcaM, forcaV, instM, instV);
}