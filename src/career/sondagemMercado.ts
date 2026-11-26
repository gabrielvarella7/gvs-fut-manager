import type { Jogador } from '../types/schema';
import type { RumorOfertaMercado } from '../types/mundoClube';
import type { NegociacaoTransferencia, OfertaTransferencia } from './types';
import { adicionarDias } from './brasileirao';
import { avaliarRespostaVenda, ofertaPadraoVenda } from './transfers';
import { criarIdNegociacao } from './transfers';

/** 0–100 — tendência do atleta aceitar sair após acordo entre clubes. */
export function tendenciaJogadorAceitarSaida(jogador: Jogador, valorOferta: number): number {
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

export function rotuloTendenciaSaida(pct: number): string {
  if (pct >= 72) return 'Tende a aceitar sair';
  if (pct >= 48) return 'Indiferente — negociação equilibrada';
  return 'Resistente a deixar o clube';
}

export function enriquecerRumorEntrada(
  rumor: RumorOfertaMercado,
  jogador: Jogador,
  dataISO: string,
): RumorOfertaMercado {
  const tendencia = tendenciaJogadorAceitarSaida(jogador, rumor.valorIndicativo);
  return {
    ...rumor,
    status: 'pendente_resposta',
    criadoEmISO: dataISO,
    prazoRespostaISO: adicionarDias(dataISO, 3),
    tendenciaSair: tendencia,
    valorPedido: rumor.valorIndicativo,
    diasNegociacaoRestantes: 0,
  };
}

export function rumorPendenteResposta(r: RumorOfertaMercado): boolean {
  return (r.status ?? 'pendente_resposta') === 'pendente_resposta';
}

export function negociacaoDeSondagem(
  rumor: RumorOfertaMercado,
  jogador: Jogador,
  clubeVendedorId: string,
  valorPedido: number,
): NegociacaoTransferencia {
  const oferta = ofertaPadraoVenda(jogador);
  oferta.valorTransferencia = valorPedido;
  return {
    id: criarIdNegociacao(),
    tipo: 'venda',
    jogadorId: rumor.jogadorId,
    timeVendedorId: clubeVendedorId,
    timeCompradorId: rumor.timeCompradorId,
    ofertaAtual: oferta,
    contraOfertaClube: null,
    contraOfertaJogador: null,
    status: 'em_analise',
    mensagem: `${rumor.timeCompradorNome} analisa sua resposta. A negociação pode levar alguns dias.`,
    origemSondagemId: rumor.id,
    tendenciaAceitarSaida: rumor.tendenciaSair,
    faseNegociacao: 'clubes',
    diasRestantesFase: 2 + Math.floor(Math.random() * 2),
    atualizadoEm: new Date().toISOString(),
    rodadaNegociacao: 1,
  };
}

export function avancarNegociacaoPorDia(
  neg: NegociacaoTransferencia,
  jogador: Jogador,
  valorPedido: number,
): NegociacaoTransferencia | null {
  if (neg.status !== 'em_analise' && neg.status !== 'contra_proposta') return null;
  const dias = (neg.diasRestantesFase ?? 1) - 1;
  if (dias > 0) {
    return {
      ...neg,
      diasRestantesFase: dias,
      mensagem: `Aguardando retorno (${dias} dia(s)). Valor pedido: R$ ${Math.round(valorPedido / 1_000_000)}M.`,
    };
  }
  if (neg.faseNegociacao === 'jogador') return null;

  let compradorId = neg.timeCompradorId;
  let ofertaComprador = neg.contraOfertaClube;
  if (!ofertaComprador) {
    ofertaComprador = {
      ...neg.ofertaAtual,
      valorTransferencia: Math.round(neg.ofertaAtual.valorTransferencia * 0.88),
    };
  }
  const resultado = avaliarRespostaVenda(jogador, valorPedido, ofertaComprador);
  if (resultado.status === 'aceita') {
    return {
      ...neg,
      status: 'aguardando_jogador',
      faseNegociacao: 'jogador',
      contraOfertaClube: ofertaComprador,
      mensagem:
        'Clubes alinharam valores — falta a decisão do jogador (aceitar ou recusar a proposta pessoal).',
      diasRestantesFase: 1,
    };
  }
  if (resultado.status === 'contra_proposta' && resultado.contraOfertaClube) {
    const nova = resultado.contraOfertaClube.valorTransferencia;
    return {
      ...neg,
      status: 'contra_proposta',
      contraOfertaClube: resultado.contraOfertaClube,
      mensagem: `Contraproposta: R$ ${Math.round(nova / 1_000_000)}M. Aceite, recuse ou ajuste e reenvie.`,
      diasRestantesFase: 2,
    };
  }
  return {
    ...neg,
    status: 'recusada',
    mensagem: resultado.mensagem,
  };
}

export function jogadorAceitaProposta(
  jogador: Jogador,
  tendencia: number | undefined,
  oferta: OfertaTransferencia,
): boolean {
  const t = tendencia ?? tendenciaJogadorAceitarSaida(jogador, oferta.valorTransferencia);
  const salarioOk = oferta.salarioCltMensal >= (jogador.salario_mensal ?? 0) * 0.95;
  let p = t / 100;
  if (salarioOk) p += 0.12;
  else p -= 0.15;
  return Math.random() < Math.max(0.05, Math.min(0.95, p));
}