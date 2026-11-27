/**
 * Calibração do mercado de transferências — survey 1.000 movimentações BR 2025–2026.
 * Fonte: levantamento_1000_transferencias.txt (Parte 1 + Parte 3).
 */

import type { Jogador } from '../types/schema';
import type { OfertaTransferencia } from './types';

/** Tipo de negócio alinhado às médias de ciclo do survey. */
export type TipoNegocioMercado =
  | 'livre'
  | 'emprestimo'
  | 'compra_nacional'
  | 'compra_internacional'
  | 'multa_rescisoria';

/** Janelas do calendário brasileiro de mercado. */
export type JanelaCalendarioMercado =
  | 'inicio_temporada'
  | 'pos_estaduais'
  | 'meio_ano'
  | 'entressafra';

/** Desfechos observados nas 1.000 movimentações. */
export type DesfechoNegociacaoMercado =
  | 'assinada'
  | 'recusada_clube'
  | 'contraproposta'
  | 'recusada_jogador'
  | 'melada';

export interface CicloNegociacaoConfig {
  media: number;
  min: number;
  max: number;
  /** Livre: 82% fecham em até 4 dias. */
  pctAte4Dias?: number;
}

export interface JanelaMercadoInfo {
  id: JanelaCalendarioMercado;
  /** Média de notícias/dia na amostra. */
  mediaNoticiasDia: number;
  /** Pico diário (quando aplicável). */
  picoNoticiasDia?: { min: number; max: number };
  /** Parte 3: P(gerar notícia) janela aberta vs fechada. */
  probNoticiaDia: number;
  janelaAberta: boolean;
  rotulo: string;
}

/** Frequência diária por janela (Parte 1 §1). */
export const JANELAS_CALENDARIO_MERCADO = {
  inicio_temporada: {
    id: 'inicio_temporada' as const,
    mediaNoticiasDia: 7.58,
    picoNoticiasDia: { min: 12, max: 15 },
    probNoticiaDia: 0.72,
    janelaAberta: true,
    rotulo: 'Início de temporada (Jan–Fev)',
  },
  pos_estaduais: {
    id: 'pos_estaduais' as const,
    mediaNoticiasDia: 3.33,
    probNoticiaDia: 0.72,
    janelaAberta: true,
    rotulo: 'Pós-estaduais (Mar–Abr)',
  },
  meio_ano: {
    id: 'meio_ano' as const,
    mediaNoticiasDia: 5.81,
    picoNoticiasDia: { min: 10, max: 14 },
    probNoticiaDia: 0.72,
    janelaAberta: true,
    rotulo: 'Meio de ano (Jul–Set)',
  },
  entressafra: {
    id: 'entressafra' as const,
    mediaNoticiasDia: 0.68,
    probNoticiaDia: 0.28,
    janelaAberta: false,
    rotulo: 'Entressafra / rumores',
  },
} satisfies Record<JanelaCalendarioMercado, JanelaMercadoInfo>;

/** Tempo médio sondagem → assinatura por tipo (Parte 1 §2). */
export const CICLO_NEGOCIACAO_POR_TIPO: Record<TipoNegocioMercado, CicloNegociacaoConfig> = {
  livre: { media: 3.4, min: 1, max: 9, pctAte4Dias: 0.82 },
  emprestimo: { media: 6.2, min: 2, max: 14 },
  compra_nacional: { media: 11.8, min: 4, max: 26 },
  compra_internacional: { media: 18.5, min: 7, max: 42 },
  multa_rescisoria: { media: 1.5, min: 1, max: 2 },
};

/** Distribuição de desfechos (Parte 1 §3). */
export const DESFECHO_NEGOCIACAO_PESOS: Record<DesfechoNegociacaoMercado, number> = {
  assinada: 0.465,
  recusada_clube: 0.24,
  contraproposta: 0.135,
  recusada_jogador: 0.1,
  melada: 0.06,
};

/**
 * Entre negócios que chegam aos exames, fração que melam
 * (60 meladas / (465 assinadas + 60 meladas) ≈ 11,4%).
 */
export const PROB_MELADA_POS_ACEITE =
  DESFECHO_NEGOCIACAO_PESOS.melada /
  (DESFECHO_NEGOCIACAO_PESOS.assinada + DESFECHO_NEGOCIACAO_PESOS.melada);

/** Tempos de resposta da IA (Parte 3). */
export const TEMPO_RESPOSTA_MERCADO = {
  sondagemInicialMin: 2,
  sondagemInicialMax: 4,
  contrapropostaMin: 1,
  contrapropostaMax: 2,
  examesBidMin: 1,
  examesBidMax: 2,
} as const;

/** Cenário D: veterano 33+ exige ≥24 meses ou luvas +35%. */
export const VETERANO_IDADE_MIN = 33;
export const VETERANO_MESES_MIN = 24;
export const VETERANO_LUVAS_BONUS = 1.35;

/** Cenário A: reserva com suscetibilidade ≥70 + empréstimo salário 100%. */
export const SUSCETIBILIDADE_EMPRESTIMO_RAPIDO = 70;

/** Teto legal Direito de Imagem (Lei Pelé) — Cenário E. */
export const TETO_DIREITO_IMAGEM = 0.4;

/** Cap de notícias no feed do jogador por dia (amostra global é maior). */
export const MAX_NOTICIAS_MERCADO_FEED = 4;

function md(iso: string): { m: number; d: number } {
  const [, ms, ds] = iso.split('-');
  return { m: Number(ms), d: Number(ds) };
}

function inRange(m: number, d: number, m0: number, d0: number, m1: number, d1: number): boolean {
  const key = m * 100 + d;
  return key >= m0 * 100 + d0 && key <= m1 * 100 + d1;
}

/** Última semana de fev (pico 12–15/dia). */
export function ehPicoInicioTemporada(iso: string): boolean {
  const { m, d } = md(iso);
  return m === 2 && d >= 22;
}

/** Últimos 3 dias da janela meio de ano (pico 10–14/dia). */
export function ehPicoMeioAno(iso: string): boolean {
  const { m, d } = md(iso);
  return (m === 8 && d >= 31) || (m === 9 && d <= 2);
}

/**
 * Classifica a data no calendário BR.
 * Janelas: 02/Jan–28/Fev; 10/Mar–11/Abr; 10/Jul–02/Set; resto = entressafra.
 */
export function classificarJanelaCalendario(iso: string): JanelaMercadoInfo {
  const { m, d } = md(iso);
  if (inRange(m, d, 1, 2, 2, 28) || (m === 2 && d === 29)) {
    const base = JANELAS_CALENDARIO_MERCADO.inicio_temporada;
    if (ehPicoInicioTemporada(iso) && base.picoNoticiasDia) {
      return {
        ...base,
        mediaNoticiasDia: (base.picoNoticiasDia.min + base.picoNoticiasDia.max) / 2,
      };
    }
    return base;
  }
  if (inRange(m, d, 3, 10, 4, 11)) {
    return JANELAS_CALENDARIO_MERCADO.pos_estaduais;
  }
  if (inRange(m, d, 7, 10, 9, 2)) {
    const base = JANELAS_CALENDARIO_MERCADO.meio_ano;
    if (ehPicoMeioAno(iso) && base.picoNoticiasDia) {
      return {
        ...base,
        mediaNoticiasDia: (base.picoNoticiasDia.min + base.picoNoticiasDia.max) / 2,
      };
    }
    return base;
  }
  return JANELAS_CALENDARIO_MERCADO.entressafra;
}

/** Poisson simples para volume diário. */
export function poisson(lambda: number, rng: () => number = Math.random): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * Quantidade de notícias de mercado no dia (escala para o feed do career).
 * Usa λ = media/3 (mundo amplo → feed do clube) e respeita P(janela).
 */
export function sortearQuantidadeNoticiasDia(
  iso: string,
  rng: () => number = Math.random,
): number {
  const janela = classificarJanelaCalendario(iso);
  if (rng() > janela.probNoticiaDia) return 0;
  const lambdaFeed = Math.max(0.15, janela.mediaNoticiasDia / 3);
  return Math.min(MAX_NOTICIAS_MERCADO_FEED, poisson(lambdaFeed, rng));
}

export function diasRespostaSondagemInicial(rng: () => number = Math.random): number {
  const { sondagemInicialMin, sondagemInicialMax } = TEMPO_RESPOSTA_MERCADO;
  return (
    sondagemInicialMin +
    Math.floor(rng() * (sondagemInicialMax - sondagemInicialMin + 1))
  );
}

export function diasRespostaContraproposta(rng: () => number = Math.random): number {
  const { contrapropostaMin, contrapropostaMax } = TEMPO_RESPOSTA_MERCADO;
  return (
    contrapropostaMin + Math.floor(rng() * (contrapropostaMax - contrapropostaMin + 1))
  );
}

export function diasExamesBid(rng: () => number = Math.random): number {
  const { examesBidMin, examesBidMax } = TEMPO_RESPOSTA_MERCADO;
  return examesBidMin + Math.floor(rng() * (examesBidMax - examesBidMin + 1));
}

/**
 * Amostra dias de ciclo com viés à média (triangular discretizado).
 * Livre: 82% ≤ 4 dias.
 */
export function sortearDiasCiclo(
  tipo: TipoNegocioMercado,
  rng: () => number = Math.random,
): number {
  const cfg = CICLO_NEGOCIACAO_POR_TIPO[tipo];
  if (tipo === 'livre' && cfg.pctAte4Dias != null && rng() < cfg.pctAte4Dias) {
    return cfg.min + Math.floor(rng() * (4 - cfg.min + 1));
  }
  // Dois uniforms → aproximação triangular centrada na média.
  const u = (rng() + rng()) / 2;
  const span = cfg.max - cfg.min;
  const alvo = cfg.min + u * span;
  const puxado = alvo * 0.55 + cfg.media * 0.45;
  return Math.max(cfg.min, Math.min(cfg.max, Math.round(puxado)));
}

export interface FasesPipelineDias {
  jogador: number;
  exames: number;
  assinatura: number;
  total: number;
}

/**
 * Distribui o ciclo restante (após acordo entre clubes) em
 * jogador → exames (1–2) → assinatura, sem colapsar o fluxo multi-dia.
 */
export function distribuirFasesPipeline(
  tipo: TipoNegocioMercado,
  rng: () => number = Math.random,
): FasesPipelineDias {
  const total = sortearDiasCiclo(tipo, rng);
  const exames = tipo === 'multa_rescisoria' ? 1 : diasExamesBid(rng);
  let assinatura = 1;
  if (tipo === 'compra_nacional' || tipo === 'compra_internacional') {
    assinatura = 1 + Math.floor(rng() * 2);
  } else if (tipo === 'emprestimo') {
    assinatura = 1 + (rng() < 0.4 ? 1 : 0);
  }

  let jogador = total - exames - assinatura;
  if (tipo === 'multa_rescisoria') {
    jogador = 1;
  } else if (tipo === 'livre') {
    jogador = Math.max(1, Math.min(6, jogador));
  } else {
    jogador = Math.max(1, jogador);
  }

  // Garante multi-dia mínimo (não regressar pipeline).
  if (jogador + exames + assinatura < 3 && tipo !== 'multa_rescisoria') {
    jogador = Math.max(jogador, 2);
  }

  return {
    jogador,
    exames,
    assinatura,
    total: jogador + exames + assinatura,
  };
}

export function classificarTipoNegocio(input: {
  jogador: Jogador;
  oferta: OfertaTransferencia;
  compradorInternacional?: boolean;
}): TipoNegocioMercado {
  const { jogador, oferta, compradorInternacional } = input;
  if (!jogador.time_id) return 'livre';
  if (oferta.isEmprestimo) return 'emprestimo';
  const multa = jogador.contrato?.multa_nacional ?? Number.POSITIVE_INFINITY;
  const pctMax = jogador.contrato?.percentual_direitos_clube ?? 100;
  if (
    oferta.pagaMultaRescisoria ||
    (oferta.valorTransferencia >= multa && oferta.percentualDireitos >= pctMax)
  ) {
    return 'multa_rescisoria';
  }
  if (oferta.isInternacional || compradorInternacional) return 'compra_internacional';
  return 'compra_nacional';
}

export function sortearDesfechoNegociacao(
  rng: () => number = Math.random,
): DesfechoNegociacaoMercado {
  const roll = rng();
  let acc = 0;
  for (const [k, w] of Object.entries(DESFECHO_NEGOCIACAO_PESOS) as [
    DesfechoNegociacaoMercado,
    number,
  ][]) {
    acc += w;
    if (roll < acc) return k;
  }
  return 'assinada';
}

/** Colapso em exames / FFP / prazo após aceite do atleta. */
export function deveMelarNosExames(rng: () => number = Math.random): boolean {
  return rng() < PROB_MELADA_POS_ACEITE;
}

/**
 * Cenário A: reserva + suscetibilidade ≥70 + empréstimo com salário integral
 * → aceite rápido (2–4 dias no ciclo do atleta).
 */
export function emprestimoAceiteRapido(jogador: Jogador, oferta: OfertaTransferencia): boolean {
  if (!oferta.isEmprestimo) return false;
  const sus = jogador.suscetibilidade?.indice ?? 50;
  if (sus < SUSCETIBILIDADE_EMPRESTIMO_RAPIDO) return false;
  if (jogador.status_escalacao === 'TITULAR') return false;
  const salarioAtual =
    (jogador.contrato?.salario_clt_mensal ?? 0) +
    (jogador.contrato?.direito_imagem_mensal ?? 0) ||
    jogador.salario_mensal ||
    0;
  const salarioNovo = oferta.salarioCltMensal + oferta.direitoImagemMensal;
  return salarioNovo >= salarioAtual * 0.98;
}

/**
 * Cenário D: veterano 33+ com oferta de 12 meses sem luvas +35% → recusa.
 */
export function veteranoRecusaContratoCurto(
  jogador: Jogador,
  duracaoMeses: number,
  luvas: number,
): { recusa: boolean; motivo?: string } {
  if (jogador.idade < VETERANO_IDADE_MIN) return { recusa: false };
  if (duracaoMeses >= VETERANO_MESES_MIN) return { recusa: false };
  const salario =
    (jogador.contrato?.salario_clt_mensal ?? 0) +
      (jogador.contrato?.direito_imagem_mensal ?? 0) ||
    jogador.salario_mensal ||
    50_000;
  const luvasMin = salario * 0.9 * VETERANO_LUVAS_BONUS;
  if (luvas >= luvasMin) return { recusa: false };
  return {
    recusa: true,
    motivo: `${jogador.nome} recusou: com ${jogador.idade} anos exige mínimo de ${VETERANO_MESES_MIN} meses ou luvas +35%.`,
  };
}

/** Atraso rumor→proposta oficial (1–3 dias típicos na amostra). */
export function diasRumorAteProposta(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 3);
}

export function rotuloTipoNegocio(tipo: TipoNegocioMercado): string {
  switch (tipo) {
    case 'livre':
      return 'Jogador livre';
    case 'emprestimo':
      return 'Empréstimo';
    case 'compra_nacional':
      return 'Compra nacional';
    case 'compra_internacional':
      return 'Compra internacional';
    case 'multa_rescisoria':
      return 'Multa rescisória';
  }
}

export function tituloNoticiaPorDesfecho(desfecho: DesfechoNegociacaoMercado): string {
  switch (desfecho) {
    case 'assinada':
      return 'Transferência assinada';
    case 'recusada_clube':
      return 'Clube recusa proposta';
    case 'contraproposta':
      return 'Contraproposta no mercado';
    case 'recusada_jogador':
      return 'Atleta recusa proposta';
    case 'melada':
      return 'Negociação melada';
  }
}
