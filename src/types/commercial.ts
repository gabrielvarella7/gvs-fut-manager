/** Pilares de receita e negociação comercial — GDD 04. */

export type PoliticaIngressos = 'POPULAR' | 'EQUILIBRADO' | 'ELITIZADO';

export type ModeloPagamentoTv =
  | 'COTA_FIXA_GARANTIDA'
  | 'COTA_VARIAVEL_AUDIENCIA';

export type ArchetypePatrocinio = 'BET' | 'BANCO_FINTECH' | 'MATERIAL_ESPORTIVO';

export type SlotPatrocinio = 'MASTER' | 'OMOPLATA_MANGA' | 'BARRA_CALCAO' | 'MATERIAL_ESPORTIVO';

/** IMEDIATO: sem contrato vigente no slot. POS_ENCERRAMENTO: entra quando o atual acabar. */
export type EfeitoPropostaComercial = 'IMEDIATO' | 'POS_ENCERRAMENTO';

export type FormatoPropostaVenda =
  | 'A_VISTA'
  | 'PARCELADO_METAS'
  | 'MAIS_VALIA_FUTURA';

export interface IndicadoresClube {
  hype_midia: number;
  humor_torcida: number;
  estabilidade_gestao: number;
  nivel_infraestrutura_arena: number;
  apelo_elenco: number;
  indice_entretenimento: number;
  exposicao_continental: number;
  reputacao_institucional: number;
}

export interface PropostaContratoTv {
  id: string;
  emissora: string;
  temporadas: 1 | 2;
  modelo: ModeloPagamentoTv;
  cotaMensal: number;
  bonusClassico: number;
  bonusG4: number;
  bonusTitulo: number;
  clausulaParaquedas: boolean;
  corteZ4Percentual: number;
  textoResumo: string;
  efeito: EfeitoPropostaComercial;
}

export interface ContratoTvAtivo extends PropostaContratoTv {
  temporadaInicio: number;
  temporadasRestantes: number;
  mesesRestantes: number;
}

export interface PropostaPatrocinio {
  id: string;
  empresa: string;
  archetype: ArchetypePatrocinio;
  slot: SlotPatrocinio;
  mesesDuracao: number;
  valorMensal: number;
  luvasAssinatura: number;
  multaRescisao: number;
  bonusGol: number;
  bonusVitoria: number;
  royaltyCamisaPercentual?: number;
  exigeEstabilidadeMin: number;
  riscoRescisaoZ4: boolean;
  textoResumo: string;
  efeito: EfeitoPropostaComercial;
}

export interface ContratoPatrocinioAtivo extends PropostaPatrocinio {
  mesesRestantes: number;
}

export interface PatrocinioSucessorAgendado {
  slot: SlotPatrocinio;
  proposta: PropostaPatrocinio;
}

export interface EstadoSocioTorcedor {
  baseAtiva: number;
  receitaMensalBase: number;
  receitaMensalEfetiva: number;
  churnMesAnterior: number;
  descontoIngressoPercentual: number;
}

export interface MatchdayInput {
  capacidade: number;
  politica: PoliticaIngressos;
  isClassico: boolean;
  apeloAdversario: number;
  momentoTime: number;
  fatorEstrela: number;
  fatorHorario: number;
  nivelInfra: number;
}

export interface ResultadoMatchday {
  publico: number;
  receitaIngressos: number;
  receitaConsumoArena: number;
  custoOperacaoJogo: number;
  receitaLiquida: number;
  bonusFatorCasa: number;
}

export interface PropostaVendaFormatada {
  formato: FormatoPropostaVenda;
  valorOfertado: number;
  parcelas?: number;
  percentualRevendaFutura?: number;
  textoResumo: string;
}

export type TendenciaMercadoClube = 'CRESCENDO' | 'ESTAVEL' | 'ENCOLHENDO';

export interface DimensoesClubeDinamicas {
  prestigio_marca: number;
  indice_torcida: number;
  desempenho_recente: number;
  prestigio_base: number;
  indice_torcida_base: number;
  desempenho_base: number;
  modelo_gestao: 'TRADICIONAL' | 'SAF' | 'SAF_MULTINACIONAL';
  tendencia: TendenciaMercadoClube;
  rodada_ultima_atualizacao: number;
  nota_mercado?: string;
  fator_ultimo: number;
}

export interface EstadoComercial {
  time_id: string;
  indicadores: IndicadoresClube;
  /** Prestígio, torcida e desempenho evoluem com a temporada (afetam propostas). */
  dimensoes?: DimensoesClubeDinamicas;
  politicaIngressosPadrao: PoliticaIngressos;
  propostasTvPendentes: PropostaContratoTv[];
  propostasPatrocinioPendentes: PropostaPatrocinio[];
  contratoTvAtivo: ContratoTvAtivo | null;
  /** Aceito na janela de renovação; substitui o contrato de TV ao zerar os meses do vigente. */
  contratoTvSucessor: PropostaContratoTv | null;
  patrociniosAtivos: ContratoPatrocinioAtivo[];
  patrociniosSucessores: PatrocinioSucessorAgendado[];
  sociosTorcedor: EstadoSocioTorcedor;
}