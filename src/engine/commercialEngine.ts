import type { FinancasClube, Jogador, LancamentoContabil, Time } from '../types/schema';
import type { EstadoTemporada } from '../career/brasileirao';
import { posicaoDoTime } from '../career/brasileirao';
import type {
  ContratoPatrocinioAtivo,
  ContratoTvAtivo,
  EstadoComercial,
  EstadoSocioTorcedor,
  IndicadoresClube,
  MatchdayInput,
  PoliticaIngressos,
  PropostaContratoTv,
  PropostaPatrocinio,
  PropostaVendaFormatada,
  ResultadoMatchday,
} from '../types/commercial';
import {
  aplicarDimensoesNoTime,
  atualizarDimensoesPosRodada,
  criarDimensoesIniciais,
} from '../data/perfilComercialDinamico';
import { fatorComercialClube, resolverPerfilComercial } from '../data/perfilComercialClubes';
import type { DimensoesClubeDinamicas, SlotPatrocinio } from '../types/commercial';
import { adaptarTimeMercado } from '../career/mercadoTransferencias';

export const JANELA_RENOVACAO_MESES = 6;
export const MESES_POR_TEMPORADA_TV = 12;

const SLOTS_PATROCINIO: SlotPatrocinio[] = [
  'MASTER',
  'OMOPLATA_MANGA',
  'BARRA_CALCAO',
  'MATERIAL_ESPORTIVO',
];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function round50k(n: number): number {
  return Math.round(n / 50_000) * 50_000;
}

export function calcularApeloElenco(elenco: Jogador[]): number {
  const estrelas = elenco.filter((j) => j.overall >= 82).length;
  const promessas = elenco.filter((j) => j.idade <= 21 && j.overall >= 75).length;
  return clamp(estrelas * 9 + promessas * 4 + 28);
}

export function calcularIndiceEntretenimento(
  partidasUsuario: {
    golsMandante?: number;
    golsVisitante?: number;
    mandanteId: string;
    visitanteId: string;
    ehDoUsuario: boolean;
  }[],
  clubeId: string,
): number {
  const ultimas = partidasUsuario.filter((p) => p.ehDoUsuario).slice(-10);
  if (ultimas.length === 0) return 50;
  let gols = 0;
  for (const p of ultimas) {
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    gols += gm + gv;
  }
  const media = gols / ultimas.length;
  return clamp(32 + media * 11);
}

export function calcularIndicadoresClube(params: {
  time: Time;
  elenco: Jogador[];
  brasileirao: EstadoTemporada | null;
  clubeId: string;
  salariosAtrasados: boolean;
  humorAnterior?: number;
  hypeAnterior?: number;
}): IndicadoresClube {
  const tm = adaptarTimeMercado(params.time);
  const perfil = resolverPerfilComercial(params.time);
  const pos = params.brasileirao
    ? posicaoDoTime(params.brasileirao.tabela, params.clubeId)
    : 10;
  const entretenimento = params.brasileirao
    ? calcularIndiceEntretenimento(params.brasileirao.partidas, params.clubeId)
    : 50;

  let exposicao = 0;
  if (pos <= 4) exposicao = 40;
  else if (pos <= 6) exposicao = 25;
  else if (pos <= 11) exposicao = 12;

  const bonusSafGestao =
    perfil.modelo_gestao === 'SAF_MULTINACIONAL' ? 14 : perfil.modelo_gestao === 'SAF' ? 6 : 0;
  const estabilidade = params.salariosAtrasados
    ? 35
    : clamp(68 + bonusSafGestao + (params.humorAnterior ?? 55) * 0.12);

  const humorBase = clamp(42 + perfil.indice_torcida * 0.38 + (perfil.desempenho_recente - 55) * 0.25);

  return {
    hype_midia: clamp(
      params.hypeAnterior ?? 38 + exposicao * 0.45 + perfil.desempenho_recente * 0.22,
    ),
    humor_torcida: clamp(params.humorAnterior ?? humorBase),
    estabilidade_gestao: estabilidade,
    nivel_infraestrutura_arena: clamp(
      2 +
        Math.floor(tm.prestigio / 22) +
        (perfil.modelo_gestao === 'SAF_MULTINACIONAL' ? 2 : perfil.modelo_gestao === 'SAF' ? 1 : 0),
    ),
    apelo_elenco: calcularApeloElenco(params.elenco),
    indice_entretenimento: entretenimento,
    exposicao_continental: exposicao,
    reputacao_institucional: clamp(
      52 + tm.prestigio * 0.28 + perfil.indice_torcida * 0.08 - (pos >= 17 ? 12 : 0),
    ),
  };
}

function timeParaComercial(time: Time, dimensoes?: DimensoesClubeDinamicas): Time {
  return dimensoes ? aplicarDimensoesNoTime(time, dimensoes) : time;
}

function tvPrecisaPropostas(estado: EstadoComercial): boolean {
  if (!estado.contratoTvAtivo) return true;
  return estado.contratoTvAtivo.mesesRestantes <= JANELA_RENOVACAO_MESES;
}

function slotsPatrocinioPrecisamPropostas(estado: EstadoComercial): SlotPatrocinio[] {
  return SLOTS_PATROCINIO.filter((slot) => {
    const ativo = estado.patrociniosAtivos.find((p) => p.slot === slot);
    if (!ativo) return true;
    return ativo.mesesRestantes <= JANELA_RENOVACAO_MESES;
  });
}

function normalizarContratoTv(contrato: ContratoTvAtivo): ContratoTvAtivo {
  const meses =
    contrato.mesesRestantes ??
    Math.max(1, (contrato.temporadasRestantes ?? contrato.temporadas) * MESES_POR_TEMPORADA_TV);
  return {
    ...contrato,
    temporadas: (contrato.temporadas <= 2 ? contrato.temporadas : 2) as 1 | 2,
    mesesRestantes: meses,
    temporadasRestantes: Math.max(1, Math.ceil(meses / MESES_POR_TEMPORADA_TV)),
    efeito: contrato.efeito ?? 'IMEDIATO',
  };
}

function normalizarEstadoComercialCampos(estado: EstadoComercial): EstadoComercial {
  return {
    ...estado,
    contratoTvAtivo: estado.contratoTvAtivo
      ? normalizarContratoTv(estado.contratoTvAtivo)
      : null,
    contratoTvSucessor: estado.contratoTvSucessor ?? null,
    patrociniosSucessores: estado.patrociniosSucessores ?? [],
    propostasTvPendentes: estado.propostasTvPendentes.map((p) => ({
      ...p,
      efeito: p.efeito ?? (estado.contratoTvAtivo ? 'POS_ENCERRAMENTO' : 'IMEDIATO'),
      temporadas: (p.temporadas <= 2 ? p.temporadas : 2) as 1 | 2,
    })),
    propostasPatrocinioPendentes: estado.propostasPatrocinioPendentes.map((p) => ({
      ...p,
      efeito: p.efeito ?? 'IMEDIATO',
    })),
  };
}

function refrescarPropostasPendentes(
  estado: EstadoComercial,
  time: Time,
  indicadores: IndicadoresClube,
  seed: number,
): Pick<EstadoComercial, 'propostasTvPendentes' | 'propostasPatrocinioPendentes'> {
  const timeMercado = timeParaComercial(time, estado.dimensoes);
  const tm = adaptarTimeMercado(timeMercado);

  const tv =
    tvPrecisaPropostas(estado) ?
      gerarPropostasTv(tm, indicadores, seed).map((p, i) => ({
        ...p,
        id: `tv_${seed}_${i}`,
        efeito: estado.contratoTvAtivo ? ('POS_ENCERRAMENTO' as const) : ('IMEDIATO' as const),
        textoResumo: estado.contratoTvAtivo
          ? `${p.textoResumo} Vigência após o contrato atual (${estado.contratoTvAtivo.mesesRestantes} meses restantes).`
          : p.textoResumo,
      }))
    : estado.propostasTvPendentes;

  const slots = slotsPatrocinioPrecisamPropostas(estado);
  const pat =
    slots.length > 0 ?
      gerarPropostasPatrocinio(tm, indicadores, indicadores.estabilidade_gestao, seed)
        .filter((p) => slots.includes(p.slot))
        .map((p, i) => {
          const ativo = estado.patrociniosAtivos.find((a) => a.slot === p.slot);
          const efeito = ativo ? ('POS_ENCERRAMENTO' as const) : ('IMEDIATO' as const);
          return {
            ...p,
            id: `pat_${seed}_${i}_${p.slot}`,
            efeito,
            textoResumo:
              ativo ?
                `${p.textoResumo} Entra em vigor ao fim do contrato atual (${ativo.mesesRestantes} meses).`
              : p.textoResumo,
          };
        })
    : estado.propostasPatrocinioPendentes;

  return { propostasTvPendentes: tv, propostasPatrocinioPendentes: pat };
}

export function criarEstadoComercialInicial(time: Time, elenco: Jogador[]): EstadoComercial {
  const dimensoes = criarDimensoesIniciais(time, 0);
  const timeDin = timeParaComercial(time, dimensoes);
  const indicadores = calcularIndicadoresClube({
    time: timeDin,
    elenco,
    brasileirao: null,
    clubeId: time.id,
    salariosAtrasados: false,
  });
  const tm = adaptarTimeMercado(timeDin);
  const perfil = resolverPerfilComercial(time);
  const cap = tm.capacidade;
  const baseSocios = Math.round(
    cap * (0.045 + perfil.indice_torcida / 380) + perfil.indice_torcida * 28,
  );
  const ticketSocio = 16 + Math.round(perfil.desempenho_recente / 12);
  const receitaSocio = round50k(25_000 + baseSocios * ticketSocio);

  const estado: EstadoComercial = {
    time_id: time.id,
    indicadores,
    dimensoes,
    politicaIngressosPadrao: 'EQUILIBRADO',
    propostasTvPendentes: [],
    propostasPatrocinioPendentes: [],
    contratoTvAtivo: null,
    contratoTvSucessor: null,
    patrociniosAtivos: [],
    patrociniosSucessores: [],
    sociosTorcedor: {
      baseAtiva: baseSocios,
      receitaMensalBase: receitaSocio,
      receitaMensalEfetiva: receitaSocio,
      churnMesAnterior: 0,
      descontoIngressoPercentual: 15,
    },
  };

  estado.propostasTvPendentes = gerarPropostasTv(tm, indicadores, time.id.length).map((p) => ({
    ...p,
    efeito: 'IMEDIATO' as const,
  }));
  estado.propostasPatrocinioPendentes = gerarPropostasPatrocinio(
    tm,
    indicadores,
    indicadores.estabilidade_gestao,
    time.id.length,
  ).map((p) => ({ ...p, efeito: 'IMEDIATO' as const }));
  return estado;
}

export function gerarPropostasTv(time: Time, ind: IndicadoresClube, seed = 0): PropostaContratoTv[] {
  const tm = adaptarTimeMercado(time);
  const fator =
    fatorComercialClube(time) *
    (1 + ind.apelo_elenco / 200) *
    (1 + ind.indice_entretenimento / 200);

  const baseFixa = round50k(3_200_000 * fator);
  const baseVariavel = round50k(baseFixa * 0.75);

  const tempFixa = ((seed + 3) % 2 === 0 ? 1 : 2) as 1 | 2;
  const tempVar = ((seed + 7) % 2 === 0 ? 1 : 2) as 1 | 2;

  const propostas: PropostaContratoTv[] = [
    {
      id: `tv_fix_${Date.now()}`,
      emissora: 'Globo · pacote nacional',
      temporadas: tempFixa,
      modelo: 'COTA_FIXA_GARANTIDA',
      efeito: 'IMEDIATO',
      cotaMensal: baseFixa,
      bonusClassico: round50k(baseFixa * 0.08),
      bonusG4: round50k(baseFixa * 0.22),
      bonusTitulo: round50k(baseFixa * 0.45),
      clausulaParaquedas: false,
      corteZ4Percentual: 50,
      textoResumo: `Cota fixa · ${tempFixa} ano(s); corte de 50% se terminar no Z-4.`,
    },
    {
      id: `tv_var_${Date.now() + 1}`,
      emissora: 'Amazon · streaming',
      temporadas: tempVar,
      modelo: 'COTA_VARIAVEL_AUDIENCIA',
      efeito: 'IMEDIATO',
      cotaMensal: baseVariavel,
      bonusClassico: round50k(baseVariavel * 0.18),
      bonusG4: round50k(baseVariavel * 0.35),
      bonusTitulo: round50k(baseVariavel * 0.55),
      clausulaParaquedas: true,
      corteZ4Percentual: 50,
      textoResumo: `Mensalidade variável · ${tempVar} ano(s); paraquedas (-12% base) se cair.`,
    },
  ];

  if (propostas[1].clausulaParaquedas) {
    propostas[1].cotaMensal = round50k(propostas[1].cotaMensal * 0.88);
  }

  return propostas;
}

export function gerarPropostasPatrocinio(
  time: Time,
  ind: IndicadoresClube,
  estabilidadeGestao: number,
  seed = 0,
): PropostaPatrocinio[] {
  const tm = adaptarTimeMercado(time);
  const base = round50k(1_800_000 * fatorComercialClube(time) * (1 + ind.hype_midia / 150));

  return [
    {
      id: `pat_bet_${Date.now()}`,
      empresa: 'Patrocinador Bet (master)',
      archetype: 'BET',
      slot: 'MASTER',
      mesesDuracao: (seed + 1) % 2 === 0 ? 12 : 24,
      valorMensal: round50k(base * 1.3),
      efeito: 'IMEDIATO',
      luvasAssinatura: round50k(base * 0.4),
      multaRescisao: round50k(base * 2),
      bonusGol: 85_000,
      bonusVitoria: 120_000,
      exigeEstabilidadeMin: 40,
      riscoRescisaoZ4: true,
      textoResumo: '+30% mensal, luvas altas; risco de corte no Z-4.',
    },
    {
      id: `pat_bank_${Date.now() + 1}`,
      empresa: 'Banco parceiro (omoplata)',
      archetype: 'BANCO_FINTECH',
      slot: 'OMOPLATA_MANGA',
      mesesDuracao: (seed + 2) % 2 === 0 ? 12 : 24,
      valorMensal: base,
      efeito: 'IMEDIATO',
      luvasAssinatura: round50k(base * 1.1),
      multaRescisao: round50k(base * 3.5),
      bonusGol: 0,
      bonusVitoria: 0,
      exigeEstabilidadeMin: 70,
      riscoRescisaoZ4: false,
      textoResumo:
        estabilidadeGestao >= 70
          ? 'Contrato longo, luvas no caixa e reajuste anual.'
          : 'Exige estabilidade de gestão ≥ 70 (salários em dia).',
    },
    {
      id: `pat_kit_${Date.now() + 2}`,
      empresa: 'Fornecedor de material esportivo',
      archetype: 'MATERIAL_ESPORTIVO',
      slot: 'MATERIAL_ESPORTIVO',
      mesesDuracao: (seed + 3) % 2 === 0 ? 12 : 24,
      valorMensal: round50k(base * 0.55),
      efeito: 'IMEDIATO',
      luvasAssinatura: 0,
      multaRescisao: round50k(base),
      bonusGol: 0,
      bonusVitoria: 0,
      royaltyCamisaPercentual: ind.apelo_elenco >= 55 ? 8 : 4,
      exigeEstabilidadeMin: 50,
      riscoRescisaoZ4: false,
      textoResumo: 'Royalties sobre venda de camisas se o elenco tiver destaque.',
    },
  ];
}

export function aceitarPropostaTv(
  estado: EstadoComercial,
  propostaId: string,
  temporadaAno: number,
): {
  estado: EstadoComercial;
  luvas: number;
  cotaMensal: number;
  modo: 'IMEDIATO' | 'AGENDADO';
} | null {
  const idx = estado.propostasTvPendentes.findIndex((p) => p.id === propostaId);
  if (idx < 0) return null;
  const p = estado.propostasTvPendentes[idx]!;
  const efeito = p.efeito ?? (estado.contratoTvAtivo ? 'POS_ENCERRAMENTO' : 'IMEDIATO');

  if (efeito === 'POS_ENCERRAMENTO') {
    if (!estado.contratoTvAtivo) return null;
    return {
      estado: {
        ...estado,
        contratoTvSucessor: p,
        propostasTvPendentes: estado.propostasTvPendentes.filter((x) => x.id !== propostaId),
      },
      luvas: 0,
      cotaMensal: 0,
      modo: 'AGENDADO',
    };
  }

  if (estado.contratoTvAtivo) return null;

  const meses = p.temporadas * MESES_POR_TEMPORADA_TV;
  const contrato: ContratoTvAtivo = {
    ...p,
    temporadaInicio: temporadaAno,
    temporadasRestantes: p.temporadas,
    mesesRestantes: meses,
    efeito: 'IMEDIATO',
  };
  return {
    estado: {
      ...estado,
      contratoTvAtivo: contrato,
      contratoTvSucessor: null,
      propostasTvPendentes: [],
    },
    luvas: 0,
    cotaMensal: p.cotaMensal,
    modo: 'IMEDIATO',
  };
}

export function aceitarPropostaPatrocinio(
  estado: EstadoComercial,
  propostaId: string,
  estabilidadeGestao: number,
): {
  estado: EstadoComercial;
  luvas: number;
  incrementoMensal: number;
  modo: 'IMEDIATO' | 'AGENDADO';
} | null {
  const p = estado.propostasPatrocinioPendentes.find((x) => x.id === propostaId);
  if (!p) return null;
  if (estabilidadeGestao < p.exigeEstabilidadeMin) return null;

  const slotOcupado = estado.patrociniosAtivos.find((a) => a.slot === p.slot);
  const efeito = p.efeito ?? (slotOcupado ? 'POS_ENCERRAMENTO' : 'IMEDIATO');

  if (efeito === 'POS_ENCERRAMENTO') {
    if (!slotOcupado) return null;
    const outros = (estado.patrociniosSucessores ?? []).filter((s) => s.slot !== p.slot);
    return {
      estado: {
        ...estado,
        patrociniosSucessores: [...outros, { slot: p.slot, proposta: p }],
        propostasPatrocinioPendentes: estado.propostasPatrocinioPendentes.filter(
          (x) => x.id !== propostaId,
        ),
      },
      luvas: 0,
      incrementoMensal: 0,
      modo: 'AGENDADO',
    };
  }

  if (slotOcupado) return null;

  const ativo: ContratoPatrocinioAtivo = {
    ...p,
    mesesRestantes: p.mesesDuracao,
    efeito: 'IMEDIATO',
  };

  return {
    estado: {
      ...estado,
      patrociniosAtivos: [...estado.patrociniosAtivos, ativo],
      propostasPatrocinioPendentes: estado.propostasPatrocinioPendentes.filter(
        (x) => x.id !== propostaId && x.slot !== p.slot,
      ),
    },
    luvas: p.luvasAssinatura,
    incrementoMensal: p.valorMensal,
    modo: 'IMEDIATO',
  };
}

export interface ResultadoTickContratosMensal {
  estado: EstadoComercial;
  luvasPatrocinio: number;
  titulosNoticia: string[];
}

/** Desconta 1 mês dos contratos; ativa sucessores e abre mercado após encerramento. */
export function processarContratosComercialMensal(
  estado: EstadoComercial,
  context?: {
    time: Time;
    indicadores: IndicadoresClube;
    seed: number;
    temporadaAno: number;
  },
): ResultadoTickContratosMensal {
  let next = normalizarEstadoComercialCampos(estado);
  const titulos: string[] = [];
  let luvasPatrocinio = 0;

  if (next.contratoTvAtivo) {
    const meses = next.contratoTvAtivo.mesesRestantes - 1;
    if (meses <= 0) {
      if (next.contratoTvSucessor) {
        const p = next.contratoTvSucessor;
        const duracao = p.temporadas * MESES_POR_TEMPORADA_TV;
        next.contratoTvAtivo = {
          ...p,
          temporadaInicio: context?.temporadaAno ?? next.contratoTvAtivo.temporadaInicio + 1,
          temporadasRestantes: p.temporadas,
          mesesRestantes: duracao,
          efeito: 'IMEDIATO',
        };
        next.contratoTvSucessor = null;
        titulos.push(`Novo contrato de TV (${p.emissora}) entrou em vigor.`);
      } else {
        next.contratoTvAtivo = null;
        titulos.push('Contrato de TV encerrado — novas propostas podem chegar.');
      }
    } else {
      next.contratoTvAtivo = {
        ...next.contratoTvAtivo,
        mesesRestantes: meses,
        temporadasRestantes: Math.max(1, Math.ceil(meses / MESES_POR_TEMPORADA_TV)),
      };
    }
  }

  const aindaAtivos: ContratoPatrocinioAtivo[] = [];
  const slotsExpirados: SlotPatrocinio[] = [];
  for (const pat of next.patrociniosAtivos) {
    const meses = pat.mesesRestantes - 1;
    if (meses <= 0) {
      slotsExpirados.push(pat.slot);
    } else {
      aindaAtivos.push({ ...pat, mesesRestantes: meses });
    }
  }
  next.patrociniosAtivos = aindaAtivos;

  for (const slot of slotsExpirados) {
    const agendado = next.patrociniosSucessores.find((s) => s.slot === slot);
    if (agendado) {
      next.patrociniosAtivos.push({
        ...agendado.proposta,
        mesesRestantes: agendado.proposta.mesesDuracao,
        efeito: 'IMEDIATO',
      });
      luvasPatrocinio += agendado.proposta.luvasAssinatura;
      next.patrociniosSucessores = next.patrociniosSucessores.filter((s) => s.slot !== slot);
      titulos.push(`Patrocínio ${agendado.proposta.empresa} ativado no slot ${slot}.`);
    } else {
      titulos.push(`Patrocínio do slot ${slot} encerrou — mercado aberto.`);
    }
  }

  if (context) {
    const propostas = refrescarPropostasPendentes(next, context.time, context.indicadores, context.seed);
    next = { ...next, ...propostas };
  }

  return { estado: next, luvasPatrocinio, titulosNoticia: titulos };
}

export function calcularReceitaMatchday(input: MatchdayInput): ResultadoMatchday {
  const politicaMult: Record<PoliticaIngressos, { ocupacao: number; ticket: number; fatorCasa: number }> = {
    POPULAR: { ocupacao: 0.95, ticket: 0.82, fatorCasa: 1.08 },
    EQUILIBRADO: { ocupacao: 0.78, ticket: 1.0, fatorCasa: 1.05 },
    ELITIZADO: { ocupacao: 0.62, ticket: 1.35, fatorCasa: 1.02 },
  };
  const cfg = politicaMult[input.politica];
  const publico = Math.round(
    input.capacidade * cfg.ocupacao * (0.85 + input.momentoTime * 0.2) * input.apeloAdversario,
  );
  const ticketMedio = Math.round(45 * cfg.ticket * input.fatorHorario);
  const receitaIngressos = publico * ticketMedio;
  const consumo = Math.round(publico * (8 + input.nivelInfra * 2.5));
  const custo = Math.round(input.capacidade * (12 + input.nivelInfra * 3));
  const bonusFatorCasa = cfg.fatorCasa + Math.min(0.03, input.fatorEstrela * 0.01);

  return {
    publico,
    receitaIngressos,
    receitaConsumoArena: consumo,
    custoOperacaoJogo: custo,
    receitaLiquida: receitaIngressos + consumo - custo,
    bonusFatorCasa,
  };
}

export function atualizarComercialPosRodada(
  estado: EstadoComercial,
  params: {
    vitoria: boolean;
    empate: boolean;
    derrota: boolean;
    isClassico: boolean;
    clubeId: string;
    elenco: Jogador[];
    time: Time;
    brasileirao: EstadoTemporada;
    salariosAtrasados: boolean;
    posicaoTabela: number;
    rodada: number;
  },
): EstadoComercial {
  let dimensoes =
    estado.dimensoes ?? criarDimensoesIniciais(params.time, params.rodada);
  const { dimensoes: dimAtualizadas, mudouSignificativo } = atualizarDimensoesPosRodada(
    dimensoes,
    {
      posicaoTabela: params.posicaoTabela,
      rodada: params.rodada,
      vitoria: params.vitoria,
      empate: params.empate,
      derrota: params.derrota,
      isClassico: params.isClassico,
      time: params.time,
    },
  );
  dimensoes = dimAtualizadas;
  const timeDin = timeParaComercial(params.time, dimensoes);

  let humor = estado.indicadores.humor_torcida;
  humor += params.vitoria ? 8 : params.empate ? 2 : -7;
  if (params.isClassico) humor += params.vitoria ? 6 : -4;

  let hype = estado.indicadores.hype_midia;
  hype += params.vitoria ? 5 : -3;
  if (params.isClassico && params.vitoria) hype += 7;

  const indicadores = calcularIndicadoresClube({
    time: timeDin,
    elenco: params.elenco,
    brasileirao: params.brasileirao,
    clubeId: params.clubeId,
    salariosAtrasados: params.salariosAtrasados,
    humorAnterior: humor,
    hypeAnterior: hype,
  });

  const base = estado.sociosTorcedor;
  let churn = params.derrota ? 3.2 : 1.1;
  if (humor < 40) churn += 2.5;
  const crescimento = params.vitoria ? 2.8 : 0.4;
  const novaBase = Math.round(base.baseAtiva * (1 + (crescimento - churn) / 100));
  const receitaEfetiva = round50k(base.receitaMensalBase * (novaBase / Math.max(1, base.baseAtiva)));

  const socios: EstadoSocioTorcedor = {
    ...base,
    baseAtiva: Math.max(500, novaBase),
    receitaMensalEfetiva: receitaEfetiva,
    churnMesAnterior: churn,
  };

  let next: EstadoComercial = {
    ...estado,
    dimensoes,
    indicadores,
    sociosTorcedor: socios,
  };

  const mercadoAberto =
    tvPrecisaPropostas(next) || slotsPatrocinioPrecisamPropostas(next).length > 0;
  const renovar =
    mercadoAberto &&
    (mudouSignificativo || params.posicaoTabela >= 17 || params.rodada % 4 === 0);

  if (renovar) {
    const propostas = refrescarPropostasPendentes(
      next,
      params.time,
      indicadores,
      params.rodada * 997 + params.posicaoTabela,
    );
    next = { ...next, ...propostas };
  }

  return next;
}

export function gerarFormatosPropostaVenda(valorBase: number, posicaoTabela: number): PropostaVendaFormatada[] {
  const pressao = posicaoTabela >= 17 ? 0.88 : 1;
  const v = Math.round(valorBase * pressao);
  return [
    {
      formato: 'A_VISTA',
      valorOfertado: Math.round(v * 0.85),
      textoResumo: '15% abaixo do valor, mas cai integral no caixa.',
    },
    {
      formato: 'PARCELADO_METAS',
      valorOfertado: Math.round(v * 1.25),
      parcelas: 12,
      textoResumo: 'Total maior em 12 parcelas + bônus por metas.',
    },
    {
      formato: 'MAIS_VALIA_FUTURA',
      valorOfertado: Math.round(v * 0.72),
      percentualRevendaFutura: 28,
      textoResumo: 'Menor à vista, mantendo 28% na próxima revenda.',
    },
  ];
}

export function matchdayParaLancamento(
  timeId: string,
  rodada: number,
  mes: number,
  mandante: string,
  visitante: string,
  resultado: ResultadoMatchday,
): LancamentoContabil {
  return {
    time_id: timeId,
    rodada,
    mes,
    tipo: 'RECEITA',
    categoria: 'BILHETERIA',
    descricao: `Matchday ${mandante} x ${visitante} · ${resultado.publico.toLocaleString('pt-BR')} torcedores`,
    valor: Math.max(0, resultado.receitaLiquida),
  };
}

export function migrarComercialLegado(time: Time, elenco: Jogador[]): EstadoComercial {
  const estado = criarEstadoComercialInicial(time, elenco);
  return estado;
}

/** Garante dimensões dinâmicas em saves antigos e recalcula propostas pendentes. */
export function normalizarEstadoComercial(
  estado: EstadoComercial,
  time: Time,
  elenco: Jogador[],
  posicaoTabela: number,
  rodada: number,
): EstadoComercial {
  let comNorm = normalizarEstadoComercialCampos(estado);
  if (!comNorm.dimensoes) {
    const dimensoes = criarDimensoesIniciais(time, rodada);
    const timeDin = timeParaComercial(time, dimensoes);
    const indicadores = calcularIndicadoresClube({
      time: timeDin,
      elenco,
      brasileirao: null,
      clubeId: time.id,
      salariosAtrasados: false,
    });
    comNorm = { ...comNorm, dimensoes, indicadores };
  }
  const mercadoAberto =
    tvPrecisaPropostas(comNorm) || slotsPatrocinioPrecisamPropostas(comNorm).length > 0;
  if (!mercadoAberto) return comNorm;
  return {
    ...comNorm,
    ...refrescarPropostasPendentes(
      comNorm,
      time,
      comNorm.indicadores,
      rodada + posicaoTabela,
    ),
  };
}

export function sincronizarFinancasComercial(
  financas: FinancasClube,
  comercial: EstadoComercial,
  posicaoTabela: number,
): FinancasClube {
  let receita_tv_mensal = financas.receita_tv_mensal;
  if (comercial.contratoTvAtivo) {
    receita_tv_mensal = comercial.contratoTvAtivo.cotaMensal;
    if (posicaoTabela >= 17) {
      const cut = comercial.contratoTvAtivo.corteZ4Percentual / 100;
      receita_tv_mensal = Math.round(receita_tv_mensal * (1 - cut));
    }
  }

  let receita_patrocinio_mensal = 0;
  for (const p of comercial.patrociniosAtivos) {
    let v = p.valorMensal;
    if (posicaoTabela >= 17 && p.riscoRescisaoZ4) v = Math.round(v * 0.65);
    receita_patrocinio_mensal += v;
  }
  if (comercial.patrociniosAtivos.length === 0) {
    receita_patrocinio_mensal = financas.receita_patrocinio_mensal;
  }

  return {
    ...financas,
    receita_tv_mensal,
    receita_patrocinio_mensal,
    receita_socio_base_mensal: comercial.sociosTorcedor.receitaMensalEfetiva,
  };
}

export function montarMatchdayInput(params: {
  mandante: Time;
  visitante: Time;
  politica: PoliticaIngressos;
  isClassico: boolean;
  momentoTime: number;
  titularesEstrela: number;
  indicadores: IndicadoresClube;
  seedHorario: number;
}): MatchdayInput {
  const apelo = 0.92 + (adaptarTimeMercado(params.visitante).prestigio / 100) * 0.35;
  const apeloAdversario = params.isClassico ? Math.max(1.35, apelo * 1.15) : apelo;
  const fatorHorario = 0.88 + (params.seedHorario % 17) / 100;

  return {
    capacidade: params.mandante.capacidade,
    politica: params.politica,
    isClassico: params.isClassico,
    apeloAdversario,
    momentoTime: params.momentoTime,
    fatorEstrela: params.titularesEstrela,
    fatorHorario,
    nivelInfra: params.indicadores.nivel_infraestrutura_arena,
  };
}