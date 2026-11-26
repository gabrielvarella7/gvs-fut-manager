import type {
  EstadoTreinoJogador,
  ProgramacaoTreinoClube,
} from './training';

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

/** VENDER: revela mais cedo para o mercado · PROFISSIONALIZAR: mais potencial, evolução mais lenta. */
export type FocoCategoriaBase = 'VENDER' | 'PROFISSIONALIZAR';

export interface CategoriaBase {
  investimentoNivel: NivelInvestimentoBase;
  foco: FocoCategoriaBase;
  /** Capacidade técnica da estrutura (1–20). */
  qualidade: number;
  ultimaPromocaoRodada: number;
  promocoesTemporada: number;
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
}