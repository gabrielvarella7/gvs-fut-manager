import type { FinancasClube, Jogador, Time } from '../types/schema';
import type { NegociacaoTransferencia, OfertaTransferencia, StatusNegociacao } from './types';
import {
  adaptarTimeMercado,
  avaliarNegociacaoJogador,
  avaliarPropostaClube,
  calcularValorMercado,
  executarTransferencia,
  obterNivelRivalidade,
} from './mercadoTransferencias';
import { posicaoDoTime, type EstadoTemporada } from './brasileirao';
import { salarioMensal, valorMercado } from './playerUtils';

export function aplicarSnapshotJogadores(base: Jogador[], snapshot: Jogador[]): Jogador[] {
  if (snapshot.length === 0) return base;
  const porId = new Map(snapshot.map((j) => [j.id, j]));
  return base.map((j) => porId.get(j.id) ?? j);
}

export function ofertaPadraoCompra(jogador: Jogador): OfertaTransferencia {
  const vm = valorMercado(jogador);
  const pct = jogador.contrato?.percentual_direitos_clube ?? 100;
  const total = salarioMensal(jogador);
  const clt = jogador.contrato?.salario_clt_mensal ?? Math.round(total * 0.65);
  const img = jogador.contrato?.direito_imagem_mensal ?? total - clt;
  return {
    valorTransferencia: Math.round((vm * (pct / 100) * 0.92) / 50_000) * 50_000,
    percentualDireitos: pct,
    salarioCltMensal: Math.round(clt / 5_000) * 5_000,
    direitoImagemMensal: Math.round(img / 5_000) * 5_000,
    luvas: Math.round(total * 1.6),
    duracaoMeses: jogador.idade <= 24 ? 48 : 36,
    isPreContrato: false,
  };
}

export function ofertaPadraoVenda(jogador: Jogador): OfertaTransferencia {
  const base = ofertaPadraoCompra(jogador);
  return {
    ...base,
    valorTransferencia: Math.round(valorMercado(jogador) / 50_000) * 50_000,
  };
}

export type ResultadoNegociacao = {
  status: StatusNegociacao;
  mensagem: string;
  contraOfertaClube: OfertaTransferencia | null;
  contraOfertaJogador: OfertaTransferencia | null;
};

export function avaliarOfertaCompra(
  jogador: Jogador,
  oferta: OfertaTransferencia,
  financasComprador: FinancasClube,
  times: Time[],
  brasileirao: EstadoTemporada | null,
  clubeCompradorId: string,
  rodadaNegociacao = 1,
): ResultadoNegociacao {
  const clubeComprador = adaptarTimeMercado(times.find((t) => t.id === clubeCompradorId)!);
  const clubeVendedor = jogador.time_id
    ? adaptarTimeMercado(times.find((t) => t.id === jogador.time_id)!)
    : null;

  const clubeResp = avaliarPropostaClube({
    jogador,
    clubeComprador,
    clubeVendedor,
    financasComprador,
    valorOferecido: oferta.valorTransferencia,
    percentualDesejado: oferta.percentualDireitos,
    isPreContrato: oferta.isPreContrato,
  });

  const prefixoRival =
    clubeResp.nivelRivalidade && clubeResp.nivelRivalidade !== 'NENHUMA'
      ? `[${clubeResp.nivelRivalidade === 'ARQUIRIVAL_HISTORICO' ? 'Arquirrival' : 'Rival estadual'}] `
      : '';

  if (!clubeResp.aceita) {
    const contra: OfertaTransferencia | null = clubeResp.contraPropostaValor
      ? {
          ...oferta,
          valorTransferencia: clubeResp.contraPropostaValor,
          percentualDireitos: clubeResp.percentualContraProposta ?? oferta.percentualDireitos,
        }
      : null;
    return {
      status: contra ? 'contra_proposta' : 'recusada',
      mensagem: `${prefixoRival}${clubeResp.motivo}`,
      contraOfertaClube: contra,
      contraOfertaJogador: null,
    };
  }

  const clubeAtual = jogador.time_id
    ? adaptarTimeMercado(times.find((t) => t.id === jogador.time_id)!)
    : null;

  const jogadorResp = avaliarNegociacaoJogador({
    jogador,
    clubeAtual,
    clubeComprador,
    salarioCltOferecido: oferta.salarioCltMensal,
    direitoImagemOferecido: oferta.direitoImagemMensal,
    luvasOferecidas: oferta.luvas,
    duracaoMeses: oferta.duracaoMeses,
    rodadaNegociacao,
  });

  const prefixoJog =
    jogadorResp.nivelRivalidade !== 'NENHUMA'
      ? `[${jogadorResp.nivelRivalidade === 'ARQUIRIVAL_HISTORICO' ? 'Arquirrival' : 'Rival'} · aderência ${jogadorResp.aderenciaOfertaPercentual}%] `
      : jogadorResp.aderenciaOfertaPercentual > 0
        ? `[Aderência ${jogadorResp.aderenciaOfertaPercentual}%] `
        : '';

  if (jogadorResp.status === 'RECUSADA') {
    return {
      status: 'recusada',
      mensagem: `${prefixoJog}${jogadorResp.motivo}`,
      contraOfertaClube: null,
      contraOfertaJogador: null,
    };
  }

  if (jogadorResp.status === 'CONTRAPROPOSTA' && jogadorResp.contraProposta) {
    const cp = jogadorResp.contraProposta;
    return {
      status: 'contra_proposta',
      mensagem: `${prefixoJog}${jogadorResp.motivo}`,
      contraOfertaClube: null,
      contraOfertaJogador: {
        ...oferta,
        salarioCltMensal: cp.salarioCltSugerido,
        direitoImagemMensal: cp.direitoImagemSugerido,
        luvas: cp.luvasSugeridas,
        duracaoMeses: cp.duracaoMesesSugerida,
      },
    };
  }

  void brasileirao;
  void posicaoDoTime;
  void obterNivelRivalidade;

  return {
    status: 'aceita',
    mensagem: `${prefixoRival}${clubeResp.motivo} ${prefixoJog}${jogadorResp.motivo}`,
    contraOfertaClube: null,
    contraOfertaJogador: null,
  };
}

export function gerarOfertaCompraCpu(
  jogador: Jogador,
  times: Time[],
  timeUsuarioId: string,
  valorPedido: number,
): { timeId: string; oferta: OfertaTransferencia } | null {
  const candidatos = times.filter((t) => t.id !== timeUsuarioId && t.id !== jogador.time_id);
  if (candidatos.length === 0) return null;
  const comprador = candidatos[(valorPedido + jogador.id) % candidatos.length]!;
  const valor = Math.round(Math.min(valorPedido, Math.max(valorMercado(jogador) * 0.75, valorPedido * 0.88)) / 50_000) * 50_000;
  const padrao = ofertaPadraoCompra(jogador);
  return {
    timeId: comprador.id,
    oferta: { ...padrao, valorTransferencia: valor },
  };
}

export function avaliarRespostaVenda(
  jogador: Jogador,
  valorPedido: number,
  oferta: OfertaTransferencia,
): ResultadoNegociacao {
  const minimo = Math.round(valorPedido * 0.88);
  if (oferta.valorTransferencia >= minimo) {
    return {
      status: 'aceita',
      mensagem: `Comprador aceitou pagar R$ ${oferta.valorTransferencia.toLocaleString('pt-BR')} pelo jogador.`,
      contraOfertaClube: null,
      contraOfertaJogador: null,
    };
  }
  return {
    status: 'contra_proposta',
    mensagem: 'Comprador quer pagar menos. Ajuste o valor ou envie nova contraproposta.',
    contraOfertaClube: {
      ...oferta,
      valorTransferencia: Math.round((oferta.valorTransferencia + valorPedido) / 2),
    },
    contraOfertaJogador: null,
  };
}

export function concluirCompraMercado(
  jogadores: Jogador[],
  neg: NegociacaoTransferencia,
  financas: FinancasClube,
): { jogadores: Jogador[]; financas: FinancasClube; erro?: string } {
  const j = jogadores.find((x) => x.id === neg.jogadorId);
  if (!j) return { jogadores, financas, erro: 'Jogador não encontrado.' };

  const oferta = neg.ofertaAtual;
  const res = executarTransferencia({
    jogador: j,
    clubeCompradorId: neg.timeCompradorId,
    valorTransferencia: oferta.valorTransferencia,
    percentualAdquirido: oferta.percentualDireitos,
    salarioCltMensal: oferta.salarioCltMensal,
    direitoImagemMensal: oferta.direitoImagemMensal,
    luvas: oferta.luvas,
    duracaoMeses: oferta.duracaoMeses,
  });

  if (financas.saldo_caixa < res.custoTotalComprador) {
    return { jogadores, financas, erro: 'Caixa insuficiente (taxa + luvas).' };
  }

  const lancamento = {
    time_id: financas.time_id,
    rodada: 0,
    mes: financas.mesContabilAtual,
    tipo: 'DESPESA' as const,
    categoria: 'COMPRA_ATLETA_LUVAS' as const,
    descricao: `Aquisição ${j.nome} (taxa + luvas, solidariedade ${res.taxaSolidariedade.toLocaleString('pt-BR')})`,
    valor: res.custoTotalComprador,
  };

  const next = jogadores.map((x) => (x.id === j.id ? res.jogadorAtualizado : x));
  return {
    jogadores: next,
    financas: {
      ...financas,
      saldo_caixa: financas.saldo_caixa - res.custoTotalComprador,
      lancamentos: [lancamento, ...financas.lancamentos].slice(0, 120),
    },
  };
}

export function concluirVenda(
  jogadores: Jogador[],
  neg: NegociacaoTransferencia,
  financas: FinancasClube,
): { jogadores: Jogador[]; financas: FinancasClube; erro?: string } {
  const j = jogadores.find((x) => x.id === neg.jogadorId);
  if (!j || !j.contrato) return { jogadores, financas, erro: 'Jogador inválido.' };

  const res = executarTransferencia({
    jogador: j,
    clubeCompradorId: neg.timeCompradorId,
    valorTransferencia: neg.ofertaAtual.valorTransferencia,
    percentualAdquirido: neg.ofertaAtual.percentualDireitos,
    salarioCltMensal: neg.ofertaAtual.salarioCltMensal,
    direitoImagemMensal: neg.ofertaAtual.direitoImagemMensal,
    luvas: neg.ofertaAtual.luvas,
    duracaoMeses: neg.ofertaAtual.duracaoMeses,
  });

  const credito = res.receitaLiquidaVendedor;
  const lancamento = {
    time_id: financas.time_id,
    rodada: 0,
    mes: financas.mesContabilAtual,
    tipo: 'RECEITA' as const,
    categoria: 'VENDA_ATLETA' as const,
    descricao: `Venda ${j.nome} (líquido após taxa solidariedade)`,
    valor: credito,
  };

  const next = jogadores.map((x) => (x.id === j.id ? res.jogadorAtualizado : x));
  return {
    jogadores: next,
    financas: {
      ...financas,
      saldo_caixa: financas.saldo_caixa + credito,
      lancamentos: [lancamento, ...financas.lancamentos].slice(0, 120),
    },
  };
}

export function criarIdNegociacao(): string {
  return `neg_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

export function pretensaoClubeVendedor(jogador: Jogador): number {
  const vm = valorMercado(jogador);
  const pct = jogador.contrato?.percentual_direitos_clube ?? 100;
  return Math.round((vm * pct) / 100);
}

export function pretensaoSalarioJogador(jogador: Jogador): number {
  return salarioMensal(jogador);
}

/** Texto de notícia após compra fechada — Lei Pelé só em pré-contrato ou livre. */
export function resumoContratacaoCompra(
  jogador: Jogador,
  neg: NegociacaoTransferencia,
  nomeClubeVendedor?: string,
): string {
  const meses = neg.ofertaAtual.duracaoMeses;
  if (!jogador.time_id) {
    return `${jogador.nome} assinou como jogador livre por ${meses} meses.`;
  }
  if (neg.ofertaAtual.isPreContrato) {
    const de = nomeClubeVendedor ? ` (atualmente no ${nomeClubeVendedor})` : '';
    return `${jogador.nome} assinou pré-contrato de ${meses} meses pela Lei Pelé${de}.`;
  }
  const vendedor = nomeClubeVendedor ?? 'clube vendedor';
  return `${jogador.nome} foi comprado do ${vendedor} por ${meses} meses — taxa de transferência e contrato fechados com o clube e o atleta.`;
}

export { calcularValorMercado };