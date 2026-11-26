import { fatorComercialClube } from '../data/perfilComercialClubes';
import type { FinancasClube, Jogador, LancamentoContabil, Time } from '../types/schema';

export interface ResumoFechamentoMensal {
  financasAtualizadas: FinancasClube;
  lancamentos: LancamentoContabil[];
  totalReceitas: number;
  totalDespesas: number;
  resultadoLiquidoMes: number;
  alertaCriseFinanceira: boolean;
}

const ENCARGOS_CLT_PERCENTUAL = 0.35;

export function inicializarFinancasClube(time: Time, elencoClube: Jogador[]): FinancasClube {
  const fator = fatorComercialClube(time);
  const fatorPrestigio = Math.pow(fator, 1.55);

  const folhaBase = elencoClube.reduce((acc, j) => {
    const clt = j.contrato?.salario_clt_mensal ?? j.salario_mensal ?? j.overall * 520;
    const img = j.contrato?.direito_imagem_mensal ?? 0;
    const cltEfetivo = j.contrato ? j.contrato.salario_clt_mensal : Math.round(clt * 0.65);
    const imgEfetivo = j.contrato ? img : clt - cltEfetivo;
    return acc + cltEfetivo * (1 + ENCARGOS_CLT_PERCENTUAL) + imgEfetivo;
  }, 0);

  const receitaTvMensal = Math.round((3_800_000 * fatorPrestigio) / 50_000) * 50_000;
  const receitaPatrocinioMensal = Math.round((2_400_000 * fatorPrestigio) / 50_000) * 50_000;
  const receitaSocioBaseMensal = Math.round((1_900_000 * fatorPrestigio) / 50_000) * 50_000;
  const receitasFixas = receitaTvMensal + receitaPatrocinioMensal + receitaSocioBaseMensal;
  const custoOperacionalMensal = Math.max(
    650_000,
    Math.round(Math.max(folhaBase * 0.28, receitasFixas * 0.22) / 25_000) * 25_000,
  );
  const saldoInicial = Math.round((14_000_000 * fatorPrestigio) / 250_000) * 250_000;

  return {
    time_id: time.id,
    saldo_caixa: saldoInicial,
    receita_tv_mensal: receitaTvMensal,
    receita_patrocinio_mensal: receitaPatrocinioMensal,
    receita_socio_base_mensal: receitaSocioBaseMensal,
    custo_operacional_mensal: custoOperacionalMensal,
    salarios_atrasados: false,
    lancamentos: [],
    mesContabilAtual: 1,
    rodadaUltimoFechamento: 0,
  };
}

export function registrarBilheteriaJogo(params: {
  financas: FinancasClube;
  mandante: Time;
  visitante: Time;
  rodada: number;
  mes: number;
  isClassico: boolean;
  aproveitamentoRecente: number;
}): { financasAtualizadas: FinancasClube; lancamento: LancamentoContabil } {
  const mandante = adaptarTimeMercado(params.mandante);
  const visitante = adaptarTimeMercado(params.visitante);
  const { financas, rodada, mes, isClassico, aproveitamentoRecente } = params;

  const baseBilheteria = 450_000 * Math.pow(mandante.prestigio / 75, 3.5);
  const multClassico = isClassico ? 1.55 : 1.0;
  const multFase = 0.8 + aproveitamentoRecente * 0.45;
  const multRival = 0.9 + (visitante.prestigio / 100) * 0.25;
  const valorBilheteria =
    Math.round((baseBilheteria * multClassico * multFase * multRival) / 10_000) * 10_000;

  const lancamento: LancamentoContabil = {
    time_id: mandante.id,
    rodada,
    mes,
    tipo: 'RECEITA',
    categoria: 'BILHETERIA',
    descricao: `Renda líquida: ${mandante.nome_curto} x ${visitante.nome_curto} (${mandante.estadio})`,
    valor: valorBilheteria,
  };

  return {
    financasAtualizadas: {
      ...financas,
      saldo_caixa: financas.saldo_caixa + valorBilheteria,
      lancamentos: [lancamento, ...financas.lancamentos].slice(0, 120),
    },
    lancamento,
  };
}

/** Bilheteria detalhada (matchday GDD 04). */
export function registrarBilheteriaMatchday(params: {
  financas: FinancasClube;
  rodada: number;
  mes: number;
  descricao: string;
  valorLiquido: number;
}): { financasAtualizadas: FinancasClube; lancamento: LancamentoContabil } {
  const { financas, rodada, mes, descricao, valorLiquido } = params;
  const lancamento: LancamentoContabil = {
    time_id: financas.time_id,
    rodada,
    mes,
    tipo: 'RECEITA',
    categoria: 'BILHETERIA',
    descricao,
    valor: Math.max(0, valorLiquido),
  };

  return {
    financasAtualizadas: {
      ...financas,
      saldo_caixa: financas.saldo_caixa + lancamento.valor,
      lancamentos: [lancamento, ...financas.lancamentos].slice(0, 120),
    },
    lancamento,
  };
}

export function processarFechamentoMensal(params: {
  financas: FinancasClube;
  elencoAtual: Jogador[];
  rodada: number;
  mes: number;
  vitoriasNoMes: number;
}): ResumoFechamentoMensal {
  const { financas, elencoAtual, rodada, mes, vitoriasNoMes } = params;
  const lancamentos: LancamentoContabil[] = [];

  const fatorEngajamentoTorcida = 0.8 + (vitoriasNoMes / 4) * 0.45;
  const receitaSocio = Math.round(financas.receita_socio_base_mensal * fatorEngajamentoTorcida);

  lancamentos.push(
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'RECEITA',
      categoria: 'DIREITOS_TV',
      descricao: `Cota mensal de transmissão (Mês ${mes})`,
      valor: financas.receita_tv_mensal,
    },
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'RECEITA',
      categoria: 'PATROCINIO',
      descricao: `Patrocínios master e uniformes (Mês ${mes})`,
      valor: financas.receita_patrocinio_mensal,
    },
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'RECEITA',
      categoria: 'SOCIO_TORCEDOR',
      descricao: `Mensalidades Programa Sócio-Torcedor (${vitoriasNoMes}V no mês)`,
      valor: receitaSocio,
    },
  );

  let totalCltComEncargos = 0;
  let totalImagem = 0;
  for (const jogador of elencoAtual) {
    const clt = jogador.contrato?.salario_clt_mensal ?? Math.round((jogador.salario_mensal ?? 0) * 0.65);
    const img = jogador.contrato?.direito_imagem_mensal ?? (jogador.salario_mensal ?? 0) - clt;
    totalCltComEncargos += Math.round(clt * (1 + ENCARGOS_CLT_PERCENTUAL));
    totalImagem += img;
  }

  lancamentos.push(
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'DESPESA',
      categoria: 'FOLHA_CLT_ENCARGOS',
      descricao: `Folha salarial CLT + 35% encargos (${elencoAtual.length} atletas)`,
      valor: totalCltComEncargos,
    },
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'DESPESA',
      categoria: 'DIREITOS_IMAGEM',
      descricao: `Contratos de Direitos de Imagem PJ (${elencoAtual.length} atletas)`,
      valor: totalImagem,
    },
    {
      time_id: financas.time_id,
      rodada,
      mes,
      tipo: 'DESPESA',
      categoria: 'OPERACAO_ESTADIO_CT',
      descricao: 'Manutenção de Estádio, CT e logística',
      valor: financas.custo_operacional_mensal,
    },
  );

  const totalReceitas = financas.receita_tv_mensal + financas.receita_patrocinio_mensal + receitaSocio;
  const totalDespesas = totalCltComEncargos + totalImagem + financas.custo_operacional_mensal;
  const resultadoLiquidoMes = totalReceitas - totalDespesas;
  const novoSaldo = financas.saldo_caixa + resultadoLiquidoMes;
  const alertaCriseFinanceira = novoSaldo < 0;

  return {
    financasAtualizadas: {
      ...financas,
      saldo_caixa: novoSaldo,
      salarios_atrasados: alertaCriseFinanceira,
      mesContabilAtual: mes + 1,
      rodadaUltimoFechamento: rodada,
      lancamentos: [...lancamentos, ...financas.lancamentos].slice(0, 120),
    },
    lancamentos,
    totalReceitas,
    totalDespesas,
    resultadoLiquidoMes,
    alertaCriseFinanceira,
  };
}

export function mesDaRodada(rodada: number): number {
  return Math.ceil(rodada / 4);
}

export function totalReceitasHistorico(financas: FinancasClube): number {
  return financas.lancamentos
    .filter((l) => l.tipo === 'RECEITA')
    .reduce((s, l) => s + l.valor, 0);
}