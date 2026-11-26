import type { MatchSimResult } from '../engine/matchEngine';
import type { CheckpointTransmissao } from '../engine/matchResume';
import type { EsquemaTatico, FinancasClube, Jogador, Time } from '../types/schema';
import type { EstadoComercial } from '../types/commercial';
import type { EstadoMundoClube } from '../types/mundoClube';
import type { EstadoTemporada } from './brasileirao';
import type { ConfiguracaoTaticaClube } from '../types/tactics';

/** @deprecated somente migração de saves antigos */
export type TipoReceita =
  | 'bilheteria'
  | 'patrocinio'
  | 'transferencia'
  | 'premiacao'
  | 'direitos_tv';

/** @deprecated somente migração de saves antigos */
export interface LinhaReceita {
  id: string;
  dataISO: string;
  tipo: TipoReceita;
  descricao: string;
  valor: number;
}

export type { FinancasClube };

export interface OfertaTransferencia {
  valorTransferencia: number;
  percentualDireitos: number;
  salarioCltMensal: number;
  direitoImagemMensal: number;
  luvas: number;
  duracaoMeses: number;
  isPreContrato?: boolean;
  /** Legado UI */
  salarioMensal?: number;
  anosContrato?: number;
}

export type StatusNegociacao =
  | 'rascunho'
  | 'em_analise'
  | 'contra_proposta'
  | 'aguardando_jogador'
  | 'aceita'
  | 'recusada'
  | 'concluida';

export interface NegociacaoTransferencia {
  id: string;
  tipo: 'compra' | 'venda';
  jogadorId: number;
  timeVendedorId: string;
  timeCompradorId: string;
  ofertaAtual: OfertaTransferencia;
  contraOfertaClube: OfertaTransferencia | null;
  contraOfertaJogador: OfertaTransferencia | null;
  status: StatusNegociacao;
  mensagem: string;
  atualizadoEm: string;
  /** Rodada da mesa com empresário (1–3). */
  rodadaNegociacao?: number;
  origemSondagemId?: string;
  tendenciaAceitarSaida?: number;
  faseNegociacao?: 'clubes' | 'jogador';
  diasRestantesFase?: number;
}

export type TelaJogo =
  | 'menu'
  | 'criar_tecnico'
  | 'escolher_time_ficticio'
  | 'hub_torneio'
  | 'escritorio'
  | 'elenco'
  | 'perfil_jogador'
  | 'noticias'
  | 'transferencias'
  | 'financas'
  | 'staff'
  | 'treinos'
  | 'base'
  | 'calendario'
  | 'classificacao'
  | 'tatica'
  | 'partida'
  | 'relatorio_pre_jogo'
  | 'propostas'
  | 'carregar'
  | 'configuracoes';

export interface NoticiaCarreira {
  id: string;
  data: string;
  titulo: string;
  texto: string;
}

export interface PerfilTecnico {
  nome: string;
  idade: number;
  timeCoracaoId: string;
  nacionalidade: string;
  esquemaPreferido: EsquemaTatico;
}

export interface TimeFicticio {
  id: string;
  nome: string;
  forca: number;
  esquema: EsquemaTatico;
  jogadores: Jogador[];
}

export interface JogoTorneio {
  id: number;
  rodada: 1 | 2 | 3;
  mandanteId: string;
  visitanteId: string;
  finalizado: boolean;
  golsMandante?: number;
  golsVisitante?: number;
  relatorio?: MatchSimResult;
  ehDoUsuario: boolean;
}

export interface DesempenhoTorneio {
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  nota: number;
}

export interface PropostaClube {
  timeId: string;
  timeNome: string;
  forca: number;
  mensagem: string;
}

export interface EstadoCarreira {
  perfil: PerfilTecnico | null;
  timesFicticios: TimeFicticio[];
  timeUsuarioId: string | null;
  esquemaAtual: EsquemaTatico;
  /** 11 ids na ordem dos slots do esquema (customizado na tela de tática) */
  alinhamento11: number[] | null;
  /** Posições livres no modo personalizado */
  usoTaticaPersonalizada: boolean;
  /** Células 6×6 dos 11 slots (modo personalizado) */
  gradeTatica11: { col: number; row: number; gol?: boolean }[] | null;
  /** Estilo de jogo + instruções coletivas */
  configTatica: ConfiguracaoTaticaClube;
  jogos: JogoTorneio[];
  desempenho: DesempenhoTorneio;
  propostas: PropostaClube[];
  torneioConcluido: boolean;
  timesReais: Time[];
  partidaAtual: MatchSimResult | null;
  /** Jogo travado ao entrar na tela de partida (evita pular rodadas) */
  partidaJogoEmCurso: number | null;
  /** Clube profissional após aceitar proposta */
  clubeRealId: string | null;
  /** Proposta confirmada com "Salvar escolha" */
  propostaSelecionadaId: string | null;
  noticias: NoticiaCarreira[];
  tela: TelaJogo;
  /** Brasileirão após assumir clube profissional */
  brasileirao: EstadoTemporada | null;
  /** Volta à partida após ajustar táticas */
  partidaRetornoTatica: boolean;
  transmissaoCheckpoint: CheckpointTransmissao | null;
  pendingResumePartida: boolean;
  financas: FinancasClube | null;
  comercial: EstadoComercial | null;
  mundoClube: EstadoMundoClube | null;
  negociacoesTransferencia: NegociacaoTransferencia[];
  /** Snapshot do elenco após transferências (gravado no save). */
  elencoPersistido?: Jogador[];
}