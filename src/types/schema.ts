export type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';

export type StatusEscalacao = 'TITULAR' | 'RESERVA' | 'NAO_RELACIONADO';

export type GravidadeLesao = 'LEVE' | 'MODERADA' | 'GRAVE';

export interface EstadoLesao {
  diasRestantes: number;
  gravidade: GravidadeLesao;
  descricao: string;
  /** Snapshot pré-lesão — médico tenta devolver atributos iguais. */
  atributosReferencia?: AtributosJogador;
  overallReferencia?: number;
}

export type EsquemaTatico =
  | '2-3-5'
  | '4-2-4'
  | '4-4-2'
  | '4-3-3'
  | '4-2-3-1'
  | '4-5-1'
  | '3-6-1'
  | '5-4-1'
  | '6-3-1'
  | '3-5-2'
  | '3-4-3'
  | '3-2-5';

export interface RegrasPontuacao {
  vitoria: number;
  empate: number;
  derrota: number;
}

export interface ZonasClassificacao {
  libertadores: number[];
  pre_libertadores: number[];
  sul_americana: number[];
  rebaixamento: number[];
}

export interface CampeonatoConfig {
  id: string;
  nome: string;
  pais: string;
  formato: string;
  turnos: number;
  total_times: number;
  total_rodadas: number;
  regras_pontuacao: RegrasPontuacao;
  zonas: ZonasClassificacao;
  /** GDD: bônus mandante (+5% = 1.05). Opcional no JSON; padrão 1.05 no motor. */
  bonus_mando_campo?: number;
}

export interface Time {
  id: string;
  slug?: string;
  nome: string;
  nome_completo: string;
  estado: string;
  cidade?: string;
  estadio: string;
  capacidade: number;
  cor_primaria: string;
  cor_secundaria: string;
  forca_geral: number;
  prestigio?: number;
  /** Torcida / base (1–100); override do catálogo em perfilComercialClubes. */
  indice_torcida?: number;
  /** Desempenho médio nos últimos anos (1–100). */
  desempenho_recente?: number;
  modelo_gestao?: 'TRADICIONAL' | 'SAF' | 'SAF_MULTINACIONAL';
  capacidade_estadio?: number;
  /** Ausente no JSON oficial; padrão 4-4-2 no motor se omitido */
  esquema_tatico_padrao?: EsquemaTatico;
}

export type CamadaSuscetibilidade =
  | 'INTRANSFERIVEL'
  | 'RELUTANTE'
  | 'ABERTO_A_PROPOSTAS'
  | 'INSATISFEITO'
  | 'FORCANDO_SAIDA';

export interface ContratoJogador {
  salario_clt_mensal: number;
  direito_imagem_mensal: number;
  duracao_meses: number;
  meses_restantes: number;
  percentual_direitos_clube: number;
  multa_nacional: number;
  multa_internacional: number;
  meses_no_clube: number;
}

export interface SuscetibilidadeTransferencia {
  indice: number;
  camada: CamadaSuscetibilidade;
  motivo_principal: string;
}

export interface LancamentoContabil {
  id?: number;
  time_id: string;
  rodada: number;
  mes: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria:
    | 'BILHETERIA'
    | 'DIREITOS_TV'
    | 'PATROCINIO'
    | 'SOCIO_TORCEDOR'
    | 'VENDA_ATLETA'
    | 'FOLHA_CLT_ENCARGOS'
    | 'DIREITOS_IMAGEM'
    | 'OPERACAO_ESTADIO_CT'
    | 'COMPRA_ATLETA_LUVAS'
    | 'RESCISAO_CONTRATUAL';
  descricao: string;
  valor: number;
}

export interface FinancasClube {
  time_id: string;
  saldo_caixa: number;
  receita_tv_mensal: number;
  receita_patrocinio_mensal: number;
  receita_socio_base_mensal: number;
  custo_operacional_mensal: number;
  salarios_atrasados: boolean;
  lancamentos: LancamentoContabil[];
  mesContabilAtual: number;
  rodadaUltimoFechamento: number;
}

export interface AtributosTecnicos {
  dominio: number;
  passe: number;
  chute: number;
  cabeceio: number;
  drible: number;
  lancamentos: number;
  bola_parada: number;
}

export interface AtributosMentais {
  leitura_jogo: number;
  cobertura: number;
  criatividade: number;
  agressividade: number;
  lideranca: number;
  pressao: number;
}

/** Quanto maior (até 20), menos tempo fora por lesão. */
export interface AtributosFisicos {
  fora_por_lesao: number;
  velocidade: number;
  forca: number;
}

export interface AtributosJogador {
  tecnicos: AtributosTecnicos;
  mentais: AtributosMentais;
  fisicos: AtributosFisicos;
}

export interface Jogador {
  id: number;
  time_id: string;
  nome: string;
  idade: number;
  posicao: Posicao;
  /** Posições secundárias declaradas — pena de afinidade limitada a −2%. */
  posicoes_secundarias?: Posicao[];
  atributos: AtributosJogador;
  overall: number;
  energia: number;
  status_escalacao: StatusEscalacao;
  valor_mercado?: number;
  salario_mensal?: number;
  nacionalidade?: string;
  contrato?: ContratoJogador;
  suscetibilidade?: SuscetibilidadeTransferencia;
  /** Indisponível enquanto diasRestantes > 0. */
  lesao?: EstadoLesao | null;
  /** Sequência de jogos fora da posição natural (insatisfação de estrela). */
  jogosImprovisoSeguidos?: number;
  /** Cicatriz de lesão grave sem médico (acelera regressão). */
  cicatrizFisica?: boolean;
  /**
   * Genética opcional (PA / absorção / propensão) — compatível com DM/fisiologia.
   */
  genetica?: {
    potencial_maximo: number;
    fator_absorcao: number;
    propensao_lesao: number;
    perfil_scout?: string;
  };
  /** Jogador promovido da base; guia evolução conforme o foco do clube. */
  formacaoBase?: {
    foco: 'VENDER' | 'PROFISSIONALIZAR';
    promovidoRodada: number;
    /** Teto informacional de OVR (modo profissionalizar). */
    potencialOvr?: number;
  };
}

export interface LinhaTabela {
  time_id: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo_gols: number;
}

export interface JogoCalendario {
  id?: number;
  rodada: number;
  mandante_id: string;
  visitante_id: string;
  gols_mandante: number | null;
  gols_visitante: number | null;
  finalizado: boolean;
}

export interface EstadoMeta {
  id: 'ativo';
  data_save: string;
  time_usuario_id: string;
  rodada_atual: number;
}

export interface SaveGamePayload {
  data_save: string;
  time_usuario_id: string;
  rodada_atual: number;
  tabela_classificacao: LinhaTabela[];
  calendario_jogos: JogoCalendario[];
  elenco_atualizado: Jogador[];
}