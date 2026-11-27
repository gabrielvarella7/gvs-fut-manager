import type { Jogador, Time } from '../types/schema';
import type { NegociacaoTransferencia, OfertaTransferencia } from './types';
import { salarioMensal } from './playerUtils';

/** Tendência local (evita ciclo com sondagemMercado). */
function tendenciaBaseSaida(jogador: Jogador, valorOferta: number): number {
  const mercado = jogador.valor_mercado ?? jogador.overall * 1200 * 40;
  const razaoValor = valorOferta / Math.max(mercado, 1);
  let t = 42 + jogador.overall * 0.35;
  if (jogador.idade <= 24) t -= 8;
  if (jogador.idade >= 30) t += 10;
  if (razaoValor >= 1.05) t += 18;
  else if (razaoValor >= 0.92) t += 8;
  else t -= 12;
  if ((jogador.energia ?? 80) < 55) t += 5;
  return Math.max(8, Math.min(92, Math.round(t)));
}

/** Negociação pessoal do atleta: 3–7 dias. */
export function diasNegociacaoJogador(rng: () => number = Math.random): number {
  return 3 + Math.floor(rng() * 5);
}

/** Exames médicos: 2–4 dias. */
export function diasExamesMedicos(rng: () => number = Math.random): number {
  return 2 + Math.floor(rng() * 3);
}

/** Formalização / assinatura: 1–3 dias. */
export function diasAssinaturaContrato(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 3);
}

export function forcaDoClube(times: Time[], timeId: string): number {
  const t = times.find((x) => x.id === timeId);
  if (!t) return 70;
  return t.forca_geral ?? t.prestigio ?? 70;
}

/**
 * Aceite/recusa do atleta com base em:
 * - clube mais fraco / mais forte
 * - expectativa de minutos (jogar mais no clube mais fraco)
 * - salário para cima / para baixo
 */
export function avaliarDecisaoSaidaJogador(input: {
  jogador: Jogador;
  forcaClubeAtual: number;
  forcaClubeComprador: number;
  oferta: OfertaTransferencia;
  tendencia?: number;
  nomeComprador?: string;
  rng?: () => number;
}): { aceita: boolean; motivo: string } {
  const {
    jogador,
    forcaClubeAtual,
    forcaClubeComprador,
    oferta,
    nomeComprador = 'o clube comprador',
    rng = Math.random,
  } = input;

  const salarioAtual = salarioMensal(jogador);
  const salarioNovo = oferta.salarioCltMensal + oferta.direitoImagemMensal;
  const deltaSalarioPct = (salarioNovo - salarioAtual) / Math.max(salarioAtual, 1);
  const deltaForca = forcaClubeComprador - forcaClubeAtual;
  const clubeMaisFraco = deltaForca < -2;

  let expectativaMinutos = 0.55;
  if (clubeMaisFraco) {
    expectativaMinutos = Math.min(0.9, 0.72 + Math.max(0, jogador.overall - 70) * 0.01);
  } else if (deltaForca > 6) {
    expectativaMinutos = jogador.overall >= 82 ? 0.55 : 0.28;
  }

  let score = (input.tendencia ?? tendenciaBaseSaida(jogador, oferta.valorTransferencia)) / 100;

  if (deltaSalarioPct >= 0.15) score += 0.18;
  else if (deltaSalarioPct >= 0.05) score += 0.1;
  else if (deltaSalarioPct >= -0.02) score += 0.02;
  else if (deltaSalarioPct >= -0.1) score -= 0.12;
  else score -= 0.22;

  if (clubeMaisFraco) {
    score -= 0.14;
    score += (expectativaMinutos - 0.5) * 0.35;
  } else if (deltaForca > 6) {
    score += 0.1;
    score += (expectativaMinutos - 0.4) * 0.2;
  } else {
    score += (expectativaMinutos - 0.5) * 0.15;
  }

  const p = Math.max(0.06, Math.min(0.94, score));
  const aceita = rng() < p;

  if (aceita) {
    const salTxt =
      deltaSalarioPct >= 0.05 ? 'com aumento salarial'
      : deltaSalarioPct <= -0.05 ? 'mesmo com ajuste salarial'
      : 'mantendo o patamar salarial';
    const ptTxt = expectativaMinutos >= 0.65 ? 'e perspectiva de mais minutos' : 'avaliando a disputa por vaga';
    return {
      aceita: true,
      motivo: `${jogador.nome} aceitou ir para ${nomeComprador} ${salTxt}, ${ptTxt}. Seguirá para os exames médicos.`,
    };
  }

  if (clubeMaisFraco && deltaSalarioPct < 0.08) {
    return {
      aceita: false,
      motivo: `${jogador.nome} recusou: considera ${nomeComprador} um passo atrás e o pacote não compensou.`,
    };
  }
  if (deltaSalarioPct < -0.05) {
    return {
      aceita: false,
      motivo: `${jogador.nome} recusou a proposta — salário abaixo do atual.`,
    };
  }
  if (!clubeMaisFraco && expectativaMinutos < 0.35) {
    return {
      aceita: false,
      motivo: `${jogador.nome} recusou: teme perder tempo de jogo em ${nomeComprador}.`,
    };
  }
  return {
    aceita: false,
    motivo: `${jogador.nome} recusou sair após avaliar clube, minutos e salário.`,
  };
}

export function iniciarFaseNegociacaoJogador(
  neg: NegociacaoTransferencia,
  jogadorNome: string,
  rng: () => number = Math.random,
): NegociacaoTransferencia {
  const dias = diasNegociacaoJogador(rng);
  return {
    ...neg,
    status: 'negociando_jogador',
    faseNegociacao: 'jogador',
    diasRestantesFase: dias,
    mensagem: `${jogadorNome} avalia a proposta pessoal (força do clube, minutos e salário). Previsão: ${dias} dia(s).`,
    atualizadoEm: new Date().toISOString(),
  };
}

export type ResultadoAvancoPipeline =
  | { tipo: 'continuar'; neg: NegociacaoTransferencia }
  | { tipo: 'recusada'; neg: NegociacaoTransferencia }
  | { tipo: 'pronta_para_assinar'; neg: NegociacaoTransferencia };

export function estaEmPipelineVenda(neg: NegociacaoTransferencia): boolean {
  return (
    neg.tipo === 'venda' &&
    (neg.status === 'negociando_jogador' ||
      neg.status === 'em_exames' ||
      neg.status === 'assinando')
  );
}

/** Avança 1 dia nas fases jogador → exames → assinatura. */
export function avancarPipelineVendaPorDia(
  neg: NegociacaoTransferencia,
  ctx: {
    jogador: Jogador;
    forcaClubeAtual: number;
    forcaClubeComprador: number;
    nomeComprador?: string;
    rng?: () => number;
  },
): ResultadoAvancoPipeline | null {
  if (!estaEmPipelineVenda(neg)) return null;
  const rng = ctx.rng ?? Math.random;
  const dias = (neg.diasRestantesFase ?? 1) - 1;

  if (dias > 0) {
    const faseLabel =
      neg.status === 'negociando_jogador' ? 'Negociação com o atleta'
      : neg.status === 'em_exames' ? 'Exames médicos'
      : 'Assinatura de contrato';
    return {
      tipo: 'continuar',
      neg: {
        ...neg,
        diasRestantesFase: dias,
        mensagem: `${faseLabel}: ${dias} dia(s) restante(s).`,
        atualizadoEm: new Date().toISOString(),
      },
    };
  }

  if (neg.status === 'negociando_jogador') {
    const oferta = neg.contraOfertaClube ?? neg.ofertaAtual;
    const decisao = avaliarDecisaoSaidaJogador({
      jogador: ctx.jogador,
      forcaClubeAtual: ctx.forcaClubeAtual,
      forcaClubeComprador: ctx.forcaClubeComprador,
      oferta,
      tendencia: neg.tendenciaAceitarSaida,
      nomeComprador: ctx.nomeComprador,
      rng,
    });
    if (!decisao.aceita) {
      return {
        tipo: 'recusada',
        neg: {
          ...neg,
          status: 'recusada',
          mensagem: decisao.motivo,
          diasRestantesFase: 0,
          atualizadoEm: new Date().toISOString(),
        },
      };
    }
    const dExames = diasExamesMedicos(rng);
    return {
      tipo: 'continuar',
      neg: {
        ...neg,
        ofertaAtual: oferta,
        status: 'em_exames',
        faseNegociacao: 'exames',
        diasRestantesFase: dExames,
        mensagem: `${decisao.motivo} Exames médicos: ${dExames} dia(s).`,
        atualizadoEm: new Date().toISOString(),
      },
    };
  }

  if (neg.status === 'em_exames') {
    const dAssina = diasAssinaturaContrato(rng);
    return {
      tipo: 'continuar',
      neg: {
        ...neg,
        status: 'assinando',
        faseNegociacao: 'assinatura',
        diasRestantesFase: dAssina,
        mensagem: `Exames médicos ok. Assinatura formal em ${dAssina} dia(s).`,
        atualizadoEm: new Date().toISOString(),
      },
    };
  }

  return {
    tipo: 'pronta_para_assinar',
    neg: {
      ...neg,
      status: 'aceita',
      faseNegociacao: 'assinatura',
      diasRestantesFase: 0,
      mensagem: 'Pronto para assinar o contrato.',
      atualizadoEm: new Date().toISOString(),
    },
  };
}

export function noticiaAssinouContrato(
  jogadorNome: string,
  timeCompradorNome: string,
  dataISO: string,
): { id: string; data: string; titulo: string; texto: string } {
  return {
    id: `n_tr_assin_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    data: dataISO,
    titulo: 'Assinou contrato',
    texto: `${jogadorNome} assinou contrato com o ${timeCompradorNome} e deixou o elenco.`,
  };
}
