export type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';

export type StatusEscalacao = 'TITULAR' | 'RESERVA' | 'NAO_RELACIONADO';

export type GravidadeLesao = 'LEVE' | 'MODERADA' | 'SERIA' | 'GRAVE';

/** Origem da lesão — traumática (choque) vs sobrecarga muscular. */
export type TipoLesao = 'TRAUMATICA' | 'SOBRECARGA';

export interface EstadoLesao {
  diasRestantes: number;
  gravidade: GravidadeLesao;
  descricao: string;
  /** Snapshot pré-lesão — médico tenta devolver atributos iguais. */
  atributosReferencia?: AtributosJogador;
  overallReferencia?: number;
  tipo?: TipoLesao;
  /** Rodadas-base aproximadas (dias/6) — recuperação canônica é por dias. */
  rodadasForaBase?: number;
  /** Id do catálogo de 30 lesões (injuryEngine). */
  lesaoId?: string;
  /** Perda de atributo pendente na alta se médico não for elite. */
  sequelaPendente?: number;
}

/** Faixa genética de fragilidade muscular (multiplicador 0,50–2,20). */
export type TierPropensaoLesao = 'INQUEBRAVEL' | 'NORMAL' | 'DE_VIDRO';

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
  /** Pré-disposição genética (PA, absorção, propensão a lesão). */
  genetica?: GeneticaAtleta;
  /** ISO da última partida disputada (curva de recuperação D+1…D+6). */
  ultimaPartidaISO?: string;
  /** Sequência de jogos fora da posição natural (insatisfação de estrela). */
  jogosImprovisoSeguidos?: number;
  /**
   * Cache da matriz atributo→posição (Gabriel).
   * Preenchido por PositionRecalculator.processarElenco / recalcular.
   */
  afinidade_matriz?: {
    posicoesNativas: string[];
    posicoesAdaptadas: { posicao: string; fatorOverall: number }[];
  };
  /** Cicatriz de lesão grave sem médico (acelera regressão). */
  cicatrizFisica?: boolean;
  /** Jogador promovido da base; guia evolução, pressão e identidade. */
  formacaoBase?: FormacaoBaseJogador;
}

export type TierCategoriaBase = 'FRACO' | 'MEDIO' | 'BOM' | 'CRAQUE';

export type FocoFormacaoLegado = 'VENDER' | 'PROFISSIONALIZAR';

export interface FormacaoBaseJogador {
  /** Foco vigente na promoção (novos) ou legado (saves antigos). */
  foco:
    | 'VENDER_PROFISSIONALIZAR'
    | 'TITULARES_CLUBE'
    | 'EQUILIBRADO'
    | FocoFormacaoLegado;
  promovidoRodada: number;
  /** Teto informacional de OVR. */
  potencialOvr?: number;
  tier?: TierCategoriaBase;
  /** Falso precoce: OVR alto, teto baixo. */
  precoceEstagnado?: boolean;
  /** Diamante bruto: OVR baixo, teto alto. */
  diamanteBruto?: boolean;
  /** Minutos totais no profissional (identidade / pressão). */
  minutosProfissional?: number;
  /** Rodadas seguidas como NAO_RELACIONADO (estagnação). */
  rodadasBancoSeguidas?: number;
  /** Sequência de bons jogos (assédio de empresário). */
  bonsJogosSeguidos?: number;
  /** Já sofreu pressão de empresário neste ciclo. */
  pressaoEmpresario?: boolean;
  /** Cria da casa (conta para identidade_base da torcida). */
  criaDaCasa?: boolean;
}

/** Alias usado pela base / mundoClube. */
export type GeneticaJogador = GeneticaAtleta;

/** Potential Ability + absorção + fragilidade — ocultos no scouting. */
export interface GeneticaAtleta {
  /** Teto máximo de overall que o atleta pode atingir (40 a 99). */
  potencial_maximo: number;
  /** Eficiência na conversão de treinos em XP (0.65x a 1.45x). */
  fator_absorcao: number;
  /** Fragilidade muscular/ligamentar inata (0.50x Inquebrável a 2.20x De Vidro). */
  propensao_lesao: number;
  /** Descrição textual revelada gradualmente pelo Olheiro / Fisiologista. */
  perfil_scout?: string;
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