import type { Lancamento, MatchSimInput, MatchSimResult, ProbabilidadesResultado } from './matchEngine';
import { forcaInstitucionalTime } from './matchProbabilidades';
import { prepararPartidaComFaixa } from './matchProbabilidades';
import {
  calcularConfrontoTatico,
  type ConfrontoTatico,
} from './matchTaticaConfronto';
import { criarRng } from './matchEngine';
import { calcularForcaSetores, forcaGlobal, montarEscalacao } from './matchEngine';
import type { CruzamentoPartida } from './matchResultadoCore';

export interface EstatisticasTime {
  possePercent: number;
  xg: number;
  finalizacoes: number;
  finalizacoesNoGol: number;
  defesasGoleiro: number;
  escanteios: number;
  faltas: number;
  passes: number;
  desarmes: number;
  cartoesAmarelos: number;
}

export interface MomentoAtaque {
  minuto: number;
  valor: number;
  golMandante?: boolean;
  golVisitante?: boolean;
}

export interface PreJogoInfo {
  probabilidades: ProbabilidadesResultado;
  forcaMandante: number;
  forcaVisitante: number;
  mandoBonus: number;
  confrontoTatico?: ConfrontoTatico;
  cruzamento?: CruzamentoPartida;
}

export interface EstatisticasPartida {
  mandante: EstatisticasTime;
  visitante: EstatisticasTime;
  momento: MomentoAtaque[];
}

export function previsaoPreJogo(
  input: MatchSimInput,
): PreJogoInfo & { forcaSetores: MatchSimResult['forcaInicial'] } {
  const mandoMult = input.mandante.mandoDeCampo !== false ? input.config.bonusMandoCampo : 1;
  const mandanteEsc =
    input.mandante.escalacao ??
    montarEscalacao(input.mandante.elenco, input.mandante.esquema);
  const visitanteEsc =
    input.visitante.escalacao ??
    montarEscalacao(input.visitante.elenco, input.visitante.esquema);
  const energia = new Map<number, number>();
  for (const j of [...mandanteEsc, ...visitanteEsc]) {
    energia.set(j.jogador.id, j.jogador.energia);
  }
  const cfg = {
    improvisacaoMult: input.config.improvisacaoMult ?? 0.8,
    improvisacaoMultPorJogador: input.config.improvisacaoMultPorJogador,
    polivalenciaPorJogador: input.config.polivalenciaPorJogador,
    energiaLimiteFadiga: input.config.energiaLimiteFadiga ?? 60,
    fadigaPorMinuto: 0,
    bonusMando: mandoMult,
  };
  const forcaInicial = {
    mandante: calcularForcaSetores(mandanteEsc, energia, cfg, { multiplicadorMando: mandoMult }),
    visitante: calcularForcaSetores(visitanteEsc, energia, cfg),
  };
  const rnd = criarRng((input.seed ?? 42) ^ 0x9e3779b9);
  const instM =
    input.mandante.forcaInstitucional ??
    forcaInstitucionalTime({ forca_geral: forcaGlobal(forcaInicial.mandante), prestigio: undefined });
  const instV =
    input.visitante.forcaInstitucional ??
    forcaInstitucionalTime({ forca_geral: forcaGlobal(forcaInicial.visitante), prestigio: undefined });

  const faixa = prepararPartidaComFaixa(
    {
      timeId: input.mandante.timeId,
      forcaInstitucional: instM,
      escalacao: mandanteEsc,
      elenco: input.mandante.elenco,
      setores: forcaInicial.mandante,
      contexto: input.contexto,
      ladoMandante: true,
    },
    {
      timeId: input.visitante.timeId,
      forcaInstitucional: instV,
      escalacao: visitanteEsc,
      elenco: input.visitante.elenco,
      setores: forcaInicial.visitante,
      contexto: input.contexto,
      ladoMandante: false,
    },
    rnd,
    0,
    0,
    mandoMult,
  );

  const confrontoTatico = calcularConfrontoTatico(
    input.mandante.esquema,
    input.visitante.esquema,
    mandanteEsc,
    visitanteEsc,
    rnd,
  );

  return {
    probabilidades: faixa.probabilidades,
    forcaMandante: Math.round(faixa.forcaMandante * 10) / 10,
    forcaVisitante: Math.round(faixa.forcaVisitante * 10) / 10,
    mandoBonus: mandoMult,
    forcaSetores: forcaInicial,
    confrontoTatico,
    cruzamento: faixa.cruzamento,
  };
}

/** Filtro de período na aba Estatísticas: partida inteira, 1º ou 2º tempo. */
export type PeriodoEstatisticas = 'todos' | '1' | '2';

function statsZeradas(): EstatisticasTime {
  return {
    possePercent: 50,
    xg: 0,
    finalizacoes: 0,
    finalizacoesNoGol: 0,
    defesasGoleiro: 0,
    escanteios: 0,
    faltas: 0,
    passes: 0,
    desarmes: 0,
    cartoesAmarelos: 0,
  };
}

function subtrairStats(a: EstatisticasTime, b: EstatisticasTime): EstatisticasTime {
  const finalizacoes = Math.max(0, a.finalizacoes - b.finalizacoes);
  const finalizacoesNoGol = Math.max(0, a.finalizacoesNoGol - b.finalizacoesNoGol);
  return {
    possePercent: a.possePercent,
    xg: Math.max(0, Math.round((a.xg - b.xg) * 100) / 100),
    finalizacoes,
    finalizacoesNoGol: Math.min(finalizacoes, finalizacoesNoGol),
    defesasGoleiro: Math.max(0, a.defesasGoleiro - b.defesasGoleiro),
    escanteios: Math.max(0, a.escanteios - b.escanteios),
    faltas: Math.max(0, a.faltas - b.faltas),
    passes: Math.max(0, a.passes - b.passes),
    desarmes: Math.max(0, a.desarmes - b.desarmes),
    cartoesAmarelos: Math.max(0, a.cartoesAmarelos - b.cartoesAmarelos),
  };
}

function estatisticasAteMinuto(
  result: MatchSimResult,
  minuto: number,
  mandanteId: string,
): { mandante: EstatisticasTime; visitante: EstatisticasTime } {
  const fator = Math.min(1, Math.max(0.08, minuto / 90));
  const base = result.estatisticas;
  if (minuto >= 90) return base;

  const lanc = result.lancamentos.filter((l) => l.minuto <= minuto && l.minuto > 0);
  const parcial = contarDeLancamentos(lanc, mandanteId, result.visitanteId);
  const blend = (total: number, parc: number) =>
    Math.round(parc + (total - parc) * fator * 0.15);

  const posseM = Math.round(
    parcial.mandante.posseWeight +
      (base.mandante.possePercent - parcial.mandante.posseWeight) * fator,
  );

  return {
    mandante: {
      ...base.mandante,
      possePercent: posseM,
      finalizacoes: blend(base.mandante.finalizacoes, parcial.mandante.finalizacoes),
      finalizacoesNoGol: blend(base.mandante.finalizacoesNoGol, parcial.mandante.finalizacoesNoGol),
      defesasGoleiro: blend(base.mandante.defesasGoleiro, parcial.mandante.defesasGoleiro),
      xg: Math.round((parcial.mandante.xg + base.mandante.xg * fator) * 100) / 100,
      escanteios: Math.round(base.mandante.escanteios * fator),
      faltas: Math.round(base.mandante.faltas * fator),
      passes: Math.round(base.mandante.passes * fator),
      desarmes: Math.round(base.mandante.desarmes * fator),
      cartoesAmarelos: parcial.mandante.cartoes,
    },
    visitante: {
      ...base.visitante,
      possePercent: 100 - posseM,
      finalizacoes: blend(base.visitante.finalizacoes, parcial.visitante.finalizacoes),
      finalizacoesNoGol: blend(base.visitante.finalizacoesNoGol, parcial.visitante.finalizacoesNoGol),
      defesasGoleiro: blend(base.visitante.defesasGoleiro, parcial.visitante.defesasGoleiro),
      xg: Math.round((parcial.visitante.xg + base.visitante.xg * fator) * 100) / 100,
      escanteios: Math.round(base.visitante.escanteios * fator),
      faltas: Math.round(base.visitante.faltas * fator),
      passes: Math.round(base.visitante.passes * fator),
      desarmes: Math.round(base.visitante.desarmes * fator),
      cartoesAmarelos: parcial.visitante.cartoes,
    },
  };
}

export function estatisticasParciais(
  result: MatchSimResult,
  minuto: number,
  mandanteId: string,
  periodo: PeriodoEstatisticas = 'todos',
): { mandante: EstatisticasTime; visitante: EstatisticasTime } {
  if (periodo === 'todos') {
    return estatisticasAteMinuto(result, minuto, mandanteId);
  }

  if (periodo === '1') {
    // Mesma base que TODOS até o 45' — no 1º tempo vivo, TODOS === 1º.
    const fim = Math.min(Math.max(minuto, 0), 45);
    if (fim <= 0) {
      return { mandante: statsZeradas(), visitante: statsZeradas() };
    }
    return estatisticasAteMinuto(result, fim, mandanteId);
  }

  // 2º tempo = acumulado até agora − 1º tempo (aditivo com TODOS).
  if (minuto <= 45) {
    return { mandante: statsZeradas(), visitante: statsZeradas() };
  }
  const ateAgora = estatisticasAteMinuto(result, minuto, mandanteId);
  const ate45 = estatisticasAteMinuto(result, 45, mandanteId);
  const mandante = subtrairStats(ateAgora.mandante, ate45.mandante);
  const visitante = subtrairStats(ateAgora.visitante, ate45.visitante);

  const lanc2 = result.lancamentos.filter(
    (l) => l.minuto > 45 && l.minuto <= minuto && l.minuto > 0,
  );
  const parcial2 = contarDeLancamentos(lanc2, mandanteId, result.visitanteId);
  const temAcao = parcial2.mandante.posseWeight !== 50 || parcial2.visitante.posseWeight !== 50
    || lanc2.length > 0;
  if (temAcao) {
    mandante.possePercent = parcial2.mandante.posseWeight;
    visitante.possePercent = parcial2.visitante.posseWeight;
  } else {
    mandante.possePercent = 50;
    visitante.possePercent = 50;
  }
  return { mandante, visitante };
}

function contarDeLancamentos(
  lanc: Lancamento[],
  mandanteId: string,
  visitanteId: string,
) {
  const m = {
    finalizacoes: 0,
    finalizacoesNoGol: 0,
    defesasGoleiro: 0,
    cartoes: 0,
    xg: 0,
    posseWeight: 50,
  };
  const v = { ...m, finalizacoes: 0, finalizacoesNoGol: 0, defesasGoleiro: 0, cartoes: 0, xg: 0, posseWeight: 50 };
  let pesoM = 0;
  let pesoV = 0;

  for (const l of lanc) {
    const casa = l.timeId === mandanteId;
    const visita = l.timeId === visitanteId;
    if (l.tipo === 'gol') {
      if (casa) {
        m.finalizacoes += 1;
        m.finalizacoesNoGol += 1;
        m.xg += 0.35;
        pesoM += 2;
      } else if (visita) {
        v.finalizacoes += 1;
        v.finalizacoesNoGol += 1;
        v.xg += 0.35;
        pesoV += 2;
      }
    } else if (l.tipo === 'chance') {
      if (casa) {
        m.finalizacoes += 1;
        m.xg += 0.12;
        pesoM += 1;
      } else if (visita) {
        v.finalizacoes += 1;
        v.xg += 0.12;
        pesoV += 1;
      }
    } else if (l.tipo === 'defesa') {
      if (casa) m.defesasGoleiro += 1;
      else if (visita) v.defesasGoleiro += 1;
      if (l.timeId === visitanteId) pesoV += 0.5;
      if (l.timeId === mandanteId) pesoM += 0.5;
    } else if (l.tipo === 'cartao_amarelo') {
      if (casa) m.cartoes += 1;
      else if (visita) v.cartoes += 1;
    }
  }
  const tot = pesoM + pesoV || 1;
  m.posseWeight = Math.round((pesoM / tot) * 100);
  v.posseWeight = 100 - m.posseWeight;
  return { mandante: m, visitante: v };
}

export function construirEstatisticasPartida(
  lancamentos: Lancamento[],
  golsMandante: number,
  golsVisitante: number,
  mandanteId: string,
  visitanteId: string,
  posseM: number,
  posseV: number,
  momento: MomentoAtaque[],
  rnd: () => number,
): EstatisticasPartida {
  const jogo = lancamentos.filter((l) => l.tipo !== 'inicio' && l.tipo !== 'intervalo' && l.tipo !== 'fim');
  const m = { chances: 0, defesas: 0, cartoes: 0 };
  const v = { chances: 0, defesas: 0, cartoes: 0 };
  for (const l of jogo) {
    const alvo = l.timeId === mandanteId ? m : l.timeId === visitanteId ? v : null;
    if (!alvo) continue;
    if (l.tipo === 'chance') alvo.chances += 1;
    if (l.tipo === 'gol') alvo.chances += 1;
    if (l.tipo === 'defesa') alvo.defesas += 1;
    if (l.tipo === 'cartao_amarelo') alvo.cartoes += 1;
  }

  const posseTotal = posseM + posseV || 1;
  const possePercM = Math.round((posseM / posseTotal) * 100);
  const possePercV = 100 - possePercM;

  const finM = m.chances + Math.floor(rnd() * 2);
  const finV = v.chances + Math.floor(rnd() * 2);
  const xgM = Math.round((golsMandante * 0.42 + finM * 0.11 + rnd() * 0.15) * 100) / 100;
  const xgV = Math.round((golsVisitante * 0.42 + finV * 0.11 + rnd() * 0.15) * 100) / 100;

  return {
    mandante: {
      possePercent: possePercM,
      xg: xgM,
      finalizacoes: finM,
      finalizacoesNoGol: Math.max(golsMandante, Math.round(finM * 0.55)),
      defesasGoleiro: v.defesas,
      escanteios: Math.round(posseM * 0.35 + rnd() * 3),
      faltas: 8 + Math.round(rnd() * 6) + v.cartoes,
      passes: Math.round(140 + possePercM * 2.2 + rnd() * 40),
      desarmes: 4 + Math.floor(rnd() * 5) + v.chances,
      cartoesAmarelos: m.cartoes,
    },
    visitante: {
      possePercent: possePercV,
      xg: xgV,
      finalizacoes: finV,
      finalizacoesNoGol: Math.max(golsVisitante, Math.round(finV * 0.55)),
      defesasGoleiro: m.defesas,
      escanteios: Math.round(posseV * 0.35 + rnd() * 3),
      faltas: 8 + Math.round(rnd() * 6) + m.cartoes,
      passes: Math.round(140 + possePercV * 2.2 + rnd() * 40),
      desarmes: 4 + Math.floor(rnd() * 5) + m.chances,
      cartoesAmarelos: v.cartoes,
    },
    momento,
  };
}