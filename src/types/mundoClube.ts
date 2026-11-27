import type {
  EstadoTreinoJogador,
  ProgramacaoTreinoClube,
} from './training';
import type {
  AtributosJogador,
  GeneticaJogador,
  Posicao,
} from './schema';

/** Mundo vivo do clube — staff, base, torcida e burocracia paralela à temporada. */

export type CargoStaff =
  | 'MEDICO'
  | 'FISIOTERAPEUTA'
  | 'PREPARADOR_FISICO'
  | 'FISIOLOGISTA'
  | 'OLHEIRO'
  | 'DIRETOR_BASE'
  | 'ASSISTENTE_TECNICO';

/** Perícia do olheiro por eixo (1–20). Quanto maior, melhores nomes ele enxerga em cada quesito. */
export interface AtributosOlheiro {
  tecnicos: number;
  fisicos: number;
  mentais: number;
  /** Descobre jovens com margem de evolução. */
  potencial: number;
}

export interface ProfissionalStaff {
  id: string;
  cargo: CargoStaff;
  nome: string;
  /** Média ou nível geral (demais cargos). */
  nivel: number;
  atributosOlheiro?: AtributosOlheiro;
}

export type NivelInvestimentoBase = 0 | 1 | 2 | 3;

/**
 * Foco do diretor da base:
 * - VENDER_PROFISSIONALIZAR: liquidez (atacantes / pontas / meias criativos)
 * - TITULARES_CLUBE: posições carentes ou envelhecidas no plantel
 * - EQUILIBRADO: setores equilibrados
 */
export type FocoCategoriaBase =
  | 'VENDER_PROFISSIONALIZAR'
  | 'TITULARES_CLUBE'
  | 'EQUILIBRADO';

/** Saves antigos usavam VENDER | PROFISSIONALIZAR. */
export type FocoCategoriaBaseLegado = 'VENDER' | 'PROFISSIONALIZAR';

export type TierCategoriaBase = 'FRACO' | 'MEDIO' | 'BOM' | 'CRAQUE';

export interface JovemSub20 {
  id: number;
  nome: string;
  idade: number;
  posicao: Posicao;
  atributos: AtributosJogador;
  overall: number;
  potencialOvr: number;
  tier: TierCategoriaBase;
  precoceEstagnado: boolean;
  diamanteBruto: boolean;
  genetica?: GeneticaJogador;
  entradaRodada: number;
  focoGeracao: FocoCategoriaBase;
}

export interface SugestaoPromocaoBase {
  jovemId: number;
  posicao: Posicao;
  motivo: 'MERITO' | 'CRISE' | 'DIRETOR';
  mensagem: string;
  rodada: number;
}

export interface CategoriaBase {
  investimentoNivel: NivelInvestimentoBase;
  foco: FocoCategoriaBase;
  /** Capacidade técnica da estrutura / CT Base (1–20). Nv5 ≈ qualidade ≥ 16. */
  qualidade: number;
  ultimaPromocaoRodada: number;
  promocoesTemporada: number;
  /** Elenco Sub-20 (ainda na base). */
  elencoSub20?: JovemSub20[];
  /** Temporada em que a safra anual já foi gerada. */
  safraTemporadaAno?: number;
  ultimaGotejamentoRodada?: number;
  sugestoesPromocao?: SugestaoPromocaoBase[];
  /** 2–3 crias relacionados + minutos → humor torcida / sócio. */
  identidadeBaseAtiva?: boolean;
  criasRelacionadosRecente?: number;
}

export interface PedidoRenovacaoContrato {
  id: string;
  jogadorId: number;
  salarioPretendido: number;
  duracaoMeses: number;
  rodadaCriada: number;
  mensagem: string;
}

export type StatusSondagemMercado =
  | 'pendente_resposta'
  | 'negociando'
  | 'encerrada'
  | 'recusada';

export interface RumorOfertaMercado {
  id: string;
  jogadorId: number;
  timeCompradorId: string;
  timeCompradorNome: string;
  valorIndicativo: number;
  rodada: number;
  texto: string;
  status?: StatusSondagemMercado;
  criadoEmISO?: string;
  prazoRespostaISO?: string;
  tendenciaSair?: number;
  valorPedido?: number;
  diasNegociacaoRestantes?: number;
}

export interface ClimaTorcedor {
  indice: number;
  sequenciaRuim: number;
  sequenciaBoa: number;
}

export type MicrocicloTreino = 'tatico' | 'fisico' | 'mental' | 'regeneracao';

export interface TreinoSemana {
  rodadaAplicada: number;
  microciclo: MicrocicloTreino;
  destaques: number[];
}

export interface EstadoMundoClube {
  time_id: string;
  staff: ProfissionalStaff[];
  base: CategoriaBase;
  /** Uma sessão por rodada entre jogos. */
  ultimoTreino?: TreinoSemana | null;
  pedidosRenovacao: PedidoRenovacaoContrato[];
  rumoresOfertas: RumorOfertaMercado[];
  climaTorcedor: ClimaTorcedor;
  rodadaUltimoTick: number;
  /** Programação semanal (regime + sessões + familiaridade). */
  programacaoTreino?: ProgramacaoTreinoClube;
  estadosTreino?: EstadoTreinoJogador[];
  /** Bônus ativos até a próxima partida do usuário. */
  bonusTreinoProximoJogo?: Record<string, number>;
  multiplicadorExecucaoTaticaTreino?: number;
  treinoBonusRodada?: number;
  /** Mês civil do último treino processado (regressão de veteranos). */
  mesUltimoTreino?: number;
  /** Contagem de partidas disputadas na temporada (progressão de overall no fim). */
  participacoesTemporada?: Record<number, number>;
}