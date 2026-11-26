import { capacidadeComercial, prestigioComercial } from '../data/perfilComercialClubes';
import type {
  CamadaSuscetibilidade,
  ContratoJogador,
  Jogador,
  Posicao,
  SuscetibilidadeTransferencia,
  Time,
} from '../types/schema';
import type { FinancasClube } from '../types/schema';

export interface TimeMercado extends Time {
  nome_curto: string;
  prestigio: number;
}

export function adaptarTimeMercado(time: Time): TimeMercado {
  return {
    ...time,
    nome_curto: time.nome,
    capacidade: capacidadeComercial(time),
    prestigio: prestigioComercial(time),
  };
}

export type NivelRivalidade = 'NENHUMA' | 'ESTADUAL_MODERADA' | 'ARQUIRIVAL_HISTORICO';

export type StatusNegociacaoJogador = 'ACEITA' | 'CONTRAPROPOSTA' | 'RECUSADA';

const ARQUIRIVAIS = new Set<string>([
  'FLA_FLU',
  'FLA_VAS',
  'FLA_BOT',
  'FLU_VAS',
  'BOT_FLU',
  'BOT_VAS',
  'COR_PAL',
  'COR_SAO',
  'PAL_SAO',
  'SAN_COR',
  'SAN_PAL',
  'SAN_SAO',
  'CAM_CRU',
  'GRE_INT',
  'BAH_VIT',
  'CAP_CFC',
]);

const RIVAIS_ESTADUAIS = new Set<string>([
  'RBB_COR',
  'RBB_PAL',
  'RBB_SAO',
  'RBB_SAN',
  'MIR_COR',
  'MIR_PAL',
  'MIR_SAO',
  'MIR_SAN',
  'MIR_RBB',
  'CHA_CAP',
  'CHA_CFC',
]);

export function obterNivelRivalidade(
  clubeAtualId: string | null | undefined,
  clubeCompradorId: string,
): NivelRivalidade {
  if (!clubeAtualId || clubeAtualId === clubeCompradorId) return 'NENHUMA';
  const par1 = `${clubeAtualId}_${clubeCompradorId}`;
  const par2 = `${clubeCompradorId}_${clubeAtualId}`;
  if (ARQUIRIVAIS.has(par1) || ARQUIRIVAIS.has(par2)) return 'ARQUIRIVAL_HISTORICO';
  if (RIVAIS_ESTADUAIS.has(par1) || RIVAIS_ESTADUAIS.has(par2)) return 'ESTADUAL_MODERADA';
  return 'NENHUMA';
}

export interface ContraPropostaTermos {
  salarioCltSugerido: number;
  direitoImagemSugerido: number;
  salarioTotalSugerido: number;
  luvasSugeridas: number;
  duracaoMesesSugerida: number;
}

export interface ResultadoNegociacaoJogador {
  status: StatusNegociacaoJogador;
  motivo: string;
  nivelRivalidade: NivelRivalidade;
  aderenciaOfertaPercentual: number;
  pacienciaRestante: number;
  contraProposta?: ContraPropostaTermos;
}

export interface PropostaClubeInput {
  jogador: Jogador;
  clubeComprador: TimeMercado;
  clubeVendedor: TimeMercado | null;
  financasComprador: FinancasClube;
  valorOferecido: number;
  percentualDesejado: number;
  isPreContrato?: boolean;
}

export interface PropostaJogadorInput {
  jogador: Jogador;
  clubeAtual?: TimeMercado | null;
  clubeComprador: TimeMercado;
  salarioCltOferecido: number;
  direitoImagemOferecido: number;
  luvasOferecidas: number;
  duracaoMeses: number;
  rodadaNegociacao?: number;
  maxRodadasPaciencia?: number;
}

export interface ResultadoAvaliacaoClube {
  aceita: boolean;
  motivo: string;
  nivelRivalidade?: NivelRivalidade;
  contraPropostaValor?: number;
  percentualContraProposta?: number;
}

export interface ResultadoAvaliacaoJogador {
  aceita: boolean;
  motivo: string;
  salarioTotalDesejado?: number;
  luvasDesejadas?: number;
}

export interface ResultadoTransferenciaConcluida {
  jogadorAtualizado: Jogador;
  custoTotalComprador: number;
  receitaLiquidaVendedor: number;
  taxaSolidariedade: number;
}

const PESO_VALOR_POSICAO: Record<Posicao, number> = {
  GOL: 0.85,
  ZAG: 0.92,
  LAT: 0.95,
  VOL: 1.0,
  MEI: 1.15,
  ATA: 1.25,
};

export function calcularValorMercado(overall: number, idade: number, posicao: Posicao): number {
  const baseExponencial = Math.pow(Math.max(50, overall) / 65, 6.2) * 3_200_000;
  let fatorIdade = 1.0;
  if (idade <= 20) fatorIdade = 1.32;
  else if (idade <= 24) fatorIdade = 1.2;
  else if (idade <= 28) fatorIdade = 1.05;
  else if (idade <= 31) fatorIdade = 0.78;
  else if (idade <= 34) fatorIdade = 0.48;
  else fatorIdade = 0.25;
  const valorBruto = baseExponencial * fatorIdade * PESO_VALOR_POSICAO[posicao];
  return Math.round(valorBruto / 50_000) * 50_000;
}

export function gerarContratoLeiPele(params: {
  salarioCltMensal: number;
  direitoImagemMensal: number;
  duracaoMeses: number;
  percentualDireitosClube: number;
  valorMercadoEstimado: number;
  mesesNoClube?: number;
}): ContratoJogador {
  const duracaoValida = Math.max(3, Math.min(60, Math.round(params.duracaoMeses)));
  const totalRemuneracao = params.salarioCltMensal + params.direitoImagemMensal;
  const tetoImagem = Math.floor(totalRemuneracao * 0.4);
  const imagemAjustada = Math.min(params.direitoImagemMensal, tetoImagem);
  const cltAjustado = Math.max(5_000, totalRemuneracao - imagemAjustada);
  const multaNacional = Math.round(cltAjustado * 2000);
  const multaInternacional = Math.max(
    multaNacional * 2,
    Math.round(params.valorMercadoEstimado * 4.5),
  );
  return {
    salario_clt_mensal: Math.round(cltAjustado),
    direito_imagem_mensal: Math.round(imagemAjustada),
    duracao_meses: duracaoValida,
    meses_restantes: duracaoValida,
    percentual_direitos_clube: Math.max(10, Math.min(100, params.percentualDireitosClube)),
    multa_nacional: multaNacional,
    multa_internacional: multaInternacional,
    meses_no_clube: params.mesesNoClube ?? 0,
  };
}

export function inicializarContratoPadrao(
  overall: number,
  idade: number,
  posicao: Posicao,
  seedNumerica: number,
): { valor_mercado: number; contrato: ContratoJogador } {
  const valorMercado = calcularValorMercado(overall, idade, posicao);
  const remuneracaoTotal = Math.round((valorMercado * 0.0155) / 5_000) * 5_000;
  const salarioClt = Math.round(remuneracaoTotal * 0.65);
  const direitoImagem = remuneracaoTotal - salarioClt;
  const duracao = 24 + (seedNumerica % 3) * 12;
  const mesesRestantes = Math.max(5, duracao - (seedNumerica % 18));
  const percentualClube = [100, 100, 80, 70, 50][seedNumerica % 5];
  const contrato = gerarContratoLeiPele({
    salarioCltMensal: salarioClt,
    direitoImagemMensal: direitoImagem,
    duracaoMeses: duracao,
    percentualDireitosClube: percentualClube,
    valorMercadoEstimado: valorMercado,
    mesesNoClube: duracao - mesesRestantes,
  });
  contrato.meses_restantes = mesesRestantes;
  return { valor_mercado: valorMercado, contrato };
}

export function calcularSuscetibilidadeJogador(
  jogador: Jogador,
  clubeAtual: TimeMercado | null,
  posicaoTabelaClube: number,
  salariosAtrasados: boolean,
): SuscetibilidadeTransferencia {
  if (!jogador.time_id || !clubeAtual || !jogador.contrato) {
    return {
      indice: 100,
      camada: 'FORCANDO_SAIDA',
      motivo_principal: 'Sem vínculo ou contrato incompleto no cadastro.',
    };
  }

  let indice = 45;
  let motivo = 'Avalia boas oportunidades de carreira.';

  if (salariosAtrasados) {
    indice += 38;
    motivo = 'Insatisfeito com atrasos salariais no clube.';
  }
  if (jogador.contrato.meses_restantes <= 6) {
    indice += 32;
    motivo = 'Em reta final de contrato; pode assinar pré-contrato.';
  } else if (jogador.contrato.meses_restantes >= 42) {
    indice -= 14;
  }
  if (jogador.contrato.meses_no_clube < 6) {
    indice -= 28;
    motivo = 'Recém-contratado e adaptado ao projeto atual.';
  }
  if (jogador.contrato.meses_no_clube >= 24 && jogador.status_escalacao === 'TITULAR') {
    indice -= 12;
    motivo = 'Identificado com a torcida e liderança no elenco.';
  }
  if (jogador.status_escalacao === 'NAO_RELACIONADO') {
    indice += 26;
    motivo = 'Fora dos planos e sem espaço no elenco.';
  } else if (jogador.status_escalacao === 'RESERVA' && jogador.overall >= 76) {
    indice += 18;
    motivo = 'Quer ser titular em outra equipe.';
  } else if (jogador.status_escalacao === 'TITULAR' && clubeAtual.prestigio >= 84) {
    indice -= 18;
    motivo = 'Peça-chave em clube de grande expressão.';
  }
  if (posicaoTabelaClube >= 17) {
    indice += 14;
    if (!salariosAtrasados) motivo = 'Preocupado com o risco de rebaixamento.';
  } else if (posicaoTabelaClube <= 4) {
    indice -= 10;
  }

  const indiceFinal = Math.max(0, Math.min(100, Math.round(indice)));
  let camada: CamadaSuscetibilidade;
  if (indiceFinal <= 15) camada = 'INTRANSFERIVEL';
  else if (indiceFinal <= 35) camada = 'RELUTANTE';
  else if (indiceFinal <= 65) camada = 'ABERTO_A_PROPOSTAS';
  else if (indiceFinal <= 85) camada = 'INSATISFEITO';
  else camada = 'FORCANDO_SAIDA';

  return { indice: indiceFinal, camada, motivo_principal: motivo };
}

export function avaliarPropostaClube(input: PropostaClubeInput): ResultadoAvaliacaoClube {
  const {
    jogador,
    clubeComprador,
    clubeVendedor,
    financasComprador,
    valorOferecido,
    percentualDesejado,
  } = input;
  const valorMercado =
    jogador.valor_mercado ?? calcularValorMercado(jogador.overall, jogador.idade, jogador.posicao);
  const nivelRivalidade = obterNivelRivalidade(jogador.time_id, clubeComprador.id);

  if (!jogador.time_id || !clubeVendedor || !jogador.contrato) {
    return {
      aceita: true,
      nivelRivalidade: 'NENHUMA',
      motivo: 'Jogador livre no mercado. Negociação direta com o atleta.',
    };
  }

  if (financasComprador.salarios_atrasados || financasComprador.saldo_caixa < valorOferecido) {
    return {
      aceita: false,
      nivelRivalidade,
      motivo: 'Caixa insuficiente ou bloqueio fiscal da diretoria para esta operação.',
    };
  }

  if (input.isPreContrato) {
    if (jogador.contrato.meses_restantes <= 6) {
      return {
        aceita: true,
        nivelRivalidade,
        motivo: 'Pré-contrato liberado pela Lei Pelé (≤ 6 meses restantes).',
      };
    }
    return {
      aceita: false,
      nivelRivalidade,
      motivo: `Pré-contrato bloqueado: restam ${jogador.contrato.meses_restantes} meses no vínculo atual.`,
    };
  }

  const maxPercentual = jogador.contrato.percentual_direitos_clube;
  if (percentualDesejado > maxPercentual) {
    return {
      aceita: false,
      nivelRivalidade,
      motivo: `O ${clubeVendedor.nome_curto} possui apenas ${maxPercentual}% dos direitos econômicos.`,
      percentualContraProposta: maxPercentual,
      contraPropostaValor: Math.round(valorMercado * (maxPercentual / 100)),
    };
  }

  if (valorOferecido >= jogador.contrato.multa_nacional && percentualDesejado === maxPercentual) {
    return {
      aceita: true,
      nivelRivalidade,
      motivo: 'Multa rescisória nacional paga à vista! O clube vendedor não pode impedir a saída.',
    };
  }

  const camada = jogador.suscetibilidade?.camada ?? 'ABERTO_A_PROPOSTAS';
  if (
    nivelRivalidade === 'ARQUIRIVAL_HISTORICO' &&
    (camada === 'INTRANSFERIVEL' || camada === 'RELUTANTE')
  ) {
    return {
      aceita: false,
      nivelRivalidade,
      motivo: `A diretoria do ${clubeVendedor.nome_curto} recusa negociar com o arquirrival ${clubeComprador.nome_curto}. Apenas mediante multa rescisória integral (R$ ${jogador.contrato.multa_nacional.toLocaleString('pt-BR')}).`,
      contraPropostaValor: jogador.contrato.multa_nacional,
      percentualContraProposta: maxPercentual,
    };
  }

  const fatorFatiamento = percentualDesejado < maxPercentual ? 1.08 : 1.0;
  let valorExigido = valorMercado * (percentualDesejado / 100) * fatorFatiamento;

  const multSuscetibilidade: Record<CamadaSuscetibilidade, number> = {
    INTRANSFERIVEL: 1.45,
    RELUTANTE: 1.2,
    ABERTO_A_PROPOSTAS: 1.0,
    INSATISFEITO: 0.85,
    FORCANDO_SAIDA: 0.65,
  };
  valorExigido *= multSuscetibilidade[camada];

  if (nivelRivalidade === 'ARQUIRIVAL_HISTORICO') valorExigido *= 1.4;
  else if (nivelRivalidade === 'ESTADUAL_MODERADA') valorExigido *= 1.18;

  if (jogador.contrato.meses_restantes <= 6) valorExigido *= 0.35;

  const pedidoFinal = Math.round(valorExigido / 50_000) * 50_000;

  if (valorOferecido >= pedidoFinal * 0.95) {
    return {
      aceita: true,
      nivelRivalidade,
      motivo: `Acordo fechado com o ${clubeVendedor.nome_curto} por ${percentualDesejado}% dos direitos.`,
    };
  }

  return {
    aceita: false,
    nivelRivalidade,
    motivo:
      nivelRivalidade === 'ARQUIRIVAL_HISTORICO'
        ? `Por se tratar de um rival direto, o ${clubeVendedor.nome_curto} exige valores elevados.`
        : `O ${clubeVendedor.nome_curto} pediu uma compensação maior pelo atleta.`,
    contraPropostaValor: pedidoFinal,
    percentualContraProposta: percentualDesejado,
  };
}

export function avaliarNegociacaoJogador(input: PropostaJogadorInput): ResultadoNegociacaoJogador {
  const {
    jogador,
    clubeAtual,
    clubeComprador,
    salarioCltOferecido,
    direitoImagemOferecido,
    luvasOferecidas,
    duracaoMeses,
    rodadaNegociacao = 1,
    maxRodadasPaciencia = 3,
  } = input;

  const nivelRivalidade = obterNivelRivalidade(jogador.time_id, clubeComprador.id);
  const pacienciaRestante = Math.max(0, maxRodadasPaciencia - rodadaNegociacao);
  const camada = jogador.suscetibilidade?.camada ?? 'ABERTO_A_PROPOSTAS';

  if (!jogador.contrato) {
    return {
      status: 'RECUSADA',
      nivelRivalidade,
      aderenciaOfertaPercentual: 0,
      pacienciaRestante: 0,
      motivo: 'Jogador sem contrato cadastrado.',
    };
  }

  const pacoteMensalOferecido = salarioCltOferecido + direitoImagemOferecido;
  if (pacoteMensalOferecido <= 0 || direitoImagemOferecido > pacoteMensalOferecido * 0.405) {
    return {
      status: 'RECUSADA',
      nivelRivalidade,
      aderenciaOfertaPercentual: 0,
      pacienciaRestante,
      motivo:
        'Proposta rejeitada pelo jurídico: Direitos de Imagem não podem ultrapassar 40% da remuneração (Lei Pelé).',
    };
  }

  if (nivelRivalidade === 'ARQUIRIVAL_HISTORICO') {
    const isIdoloOuMuitoFiel =
      camada === 'INTRANSFERIVEL' ||
      (camada === 'RELUTANTE' && jogador.contrato.meses_no_clube >= 18);
    if (isIdoloOuMuitoFiel) {
      return {
        status: 'RECUSADA',
        nivelRivalidade,
        aderenciaOfertaPercentual: 0,
        pacienciaRestante: 0,
        motivo: `${jogador.nome} encerrou a conversa: "Jamais jogaria no maior rival."`,
      };
    }
  }

  const salarioAtualTotal =
    jogador.contrato.salario_clt_mensal + jogador.contrato.direito_imagem_mensal;

  const multCamada: Record<CamadaSuscetibilidade, number> = {
    INTRANSFERIVEL: 1.55,
    RELUTANTE: 1.3,
    ABERTO_A_PROPOSTAS: 1.12,
    INSATISFEITO: 0.96,
    FORCANDO_SAIDA: 0.88,
  };

  const multRivalidadeSalario: Record<NivelRivalidade, number> = {
    NENHUMA: 1.0,
    ESTADUAL_MODERADA: 1.22,
    ARQUIRIVAL_HISTORICO: 1.45,
  };

  const multRivalidadeLuvas: Record<NivelRivalidade, number> = {
    NENHUMA: 1.0,
    ESTADUAL_MODERADA: 1.35,
    ARQUIRIVAL_HISTORICO: 1.85,
  };

  const fatorPrestigio = 1 + (82 - clubeComprador.prestigio) * 0.008;

  let duracaoIdeal = 36;
  let fatorDuracao = 1.0;
  if (jogador.idade <= 23) {
    duracaoIdeal = 48;
    if (duracaoMeses < 24) fatorDuracao = 1.08;
  } else if (jogador.idade >= 32) {
    duracaoIdeal = 24;
    if (duracaoMeses <= 12) fatorDuracao = 1.12;
    else if (duracaoMeses >= 24) fatorDuracao = 0.95;
  } else if (duracaoMeses >= 48) {
    fatorDuracao = 1.1;
  }

  const salarioAlvo =
    Math.round(
      (salarioAtualTotal *
        multCamada[camada] *
        multRivalidadeSalario[nivelRivalidade] *
        fatorPrestigio *
        fatorDuracao) /
        5_000,
    ) * 5_000;

  const luvasBase = !jogador.time_id ? salarioAlvo * 3.0 : salarioAlvo * 0.9;
  const luvasAlvo = Math.round((luvasBase * multRivalidadeLuvas[nivelRivalidade]) / 10_000) * 10_000;

  const horizonteMeses = Math.max(12, Math.min(36, duracaoMeses));
  const valorEquivalenteAlvo = salarioAlvo + (luvasAlvo * 1.15) / horizonteMeses;
  const valorEquivalenteOferta =
    pacoteMensalOferecido + (luvasOferecidas * 1.15) / horizonteMeses;
  const aderencia = Math.round((valorEquivalenteOferta / valorEquivalenteAlvo) * 100);

  if (aderencia >= 97) {
    return {
      status: 'ACEITA',
      nivelRivalidade,
      aderenciaOfertaPercentual: aderencia,
      pacienciaRestante,
      motivo:
        nivelRivalidade === 'ARQUIRIVAL_HISTORICO'
          ? `${jogador.nome} aceitou a proposta e vai trocar o ${clubeAtual?.nome_curto ?? 'clube'} pelo rival ${clubeComprador.nome_curto}!`
          : `${jogador.nome} aceitou os termos de ${duracaoMeses} meses com o ${clubeComprador.nome_curto}!`,
    };
  }

  const pisoMinimoNegociavel = nivelRivalidade === 'ARQUIRIVAL_HISTORICO' ? 78 : 68;
  if (aderencia < pisoMinimoNegociavel) {
    return {
      status: 'RECUSADA',
      nivelRivalidade,
      aderenciaOfertaPercentual: aderencia,
      pacienciaRestante: 0,
      motivo:
        nivelRivalidade === 'ARQUIRIVAL_HISTORICO'
          ? `${jogador.nome} recusou: para trocar de lado na rivalidade, os valores estão longe do mínimo.`
          : `O empresário de ${jogador.nome} considerou a oferta muito abaixo do mercado.`,
    };
  }

  if (rodadaNegociacao >= maxRodadasPaciencia) {
    return {
      status: 'RECUSADA',
      nivelRivalidade,
      aderenciaOfertaPercentual: aderencia,
      pacienciaRestante: 0,
      motivo: `Sem acordo após ${maxRodadasPaciencia} rodadas. O empresário retirou o atleta da mesa.`,
    };
  }

  const flexibilidadeRodada = rodadaNegociacao === 1 ? 0.98 : 0.95;
  const salarioSugerido = Math.round((salarioAlvo * flexibilidadeRodada) / 5_000) * 5_000;
  const direitoImagemSugerido = Math.round(salarioSugerido * 0.35);
  const salarioCltSugerido = salarioSugerido - direitoImagemSugerido;
  const luvasSugeridas = Math.round((luvasAlvo * flexibilidadeRodada) / 10_000) * 10_000;

  return {
    status: 'CONTRAPROPOSTA',
    nivelRivalidade,
    aderenciaOfertaPercentual: aderencia,
    pacienciaRestante,
    motivo:
      nivelRivalidade === 'ARQUIRIVAL_HISTORICO'
        ? `${jogador.nome} enviou contraproposta com compensação maior (rivalidade).`
        : `${jogador.nome} gostou do interesse, mas o empresário ajustou salário e luvas.`,
    contraProposta: {
      salarioCltSugerido,
      direitoImagemSugerido,
      salarioTotalSugerido: salarioSugerido,
      luvasSugeridas,
      duracaoMesesSugerida: duracaoIdeal,
    },
  };
}

/** Compatibilidade com fluxo legado (compra em uma rodada). */
export function avaliarPropostaJogador(input: PropostaJogadorInput): ResultadoAvaliacaoJogador {
  const res = avaliarNegociacaoJogador(input);
  if (res.status === 'ACEITA') {
    return { aceita: true, motivo: res.motivo };
  }
  if (res.status === 'RECUSADA') {
    return { aceita: false, motivo: res.motivo };
  }
  const cp = res.contraProposta;
  return {
    aceita: false,
    motivo: res.motivo,
    salarioTotalDesejado: cp?.salarioTotalSugerido,
    luvasDesejadas: cp?.luvasSugeridas,
  };
}

export function executarTransferencia(params: {
  jogador: Jogador;
  clubeCompradorId: string;
  valorTransferencia: number;
  percentualAdquirido: number;
  salarioCltMensal: number;
  direitoImagemMensal: number;
  luvas: number;
  duracaoMeses: number;
}): ResultadoTransferenciaConcluida {
  const taxaSolidariedade = Math.round(params.valorTransferencia * 0.05);
  const receitaLiquidaVendedor = Math.max(0, params.valorTransferencia - taxaSolidariedade);
  const custoTotalComprador = params.valorTransferencia + params.luvas;

  const valorMercado =
    params.jogador.valor_mercado ??
    calcularValorMercado(params.jogador.overall, params.jogador.idade, params.jogador.posicao);

  const novoContrato = gerarContratoLeiPele({
    salarioCltMensal: params.salarioCltMensal,
    direitoImagemMensal: params.direitoImagemMensal,
    duracaoMeses: params.duracaoMeses,
    percentualDireitosClube: params.percentualAdquirido,
    valorMercadoEstimado: valorMercado,
    mesesNoClube: 0,
  });

  const jogadorAtualizado: Jogador = {
    ...params.jogador,
    time_id: params.clubeCompradorId,
    status_escalacao: 'RESERVA',
    valor_mercado: valorMercado,
    salario_mensal: params.salarioCltMensal + params.direitoImagemMensal,
    contrato: novoContrato,
    suscetibilidade: {
      indice: 12,
      camada: 'INTRANSFERIVEL',
      motivo_principal: 'Recém-contratado pelo clube.',
    },
  };

  return {
    jogadorAtualizado,
    custoTotalComprador,
    receitaLiquidaVendedor,
    taxaSolidariedade,
  };
}