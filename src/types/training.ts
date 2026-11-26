import type { Posicao } from './schema';
import type { CargoStaff } from './mundoClube';

export type RegimeIntensidadeId =
  | 'REGENERATIVO'
  | 'EQUILIBRADO'
  | 'ALTA_INTENSIDADE'
  | 'EXTREMO';

export type PilarTreino = 'FISICO' | 'TECNICO' | 'TATICO' | 'ESPECIAL_JOGO';

export type AtributoTreinoXp = 'defesa' | 'passe' | 'chute' | 'velocidade';

export type PlanoIndividualId =
  | 'EVOLUCAO_DEFENSIVA'
  | 'MAESTRO_DISTRIBUICAO'
  | 'MATADOR_FINALIZACAO'
  | 'ACELERACAO_EXPLOSAO'
  | 'MANUTENCAO_VETERANO'
  | 'ADAPTACAO_POLIVALENCIA';

export type GravidadeLesaoTreino = 'LEVE' | 'MODERADA' | 'SERIA' | 'GRAVE';

export interface DefinicaoRegimeIntensidade {
  id: RegimeIntensidadeId;
  nome: string;
  descricao: string;
  multiplicadores: {
    ganho_xp_atributos: number;
    ganho_familiaridade_tatica: number;
    recuperacao_energia_bonus: number;
    custo_energia_treino: number;
    risco_lesao: number;
    impacto_moral: number;
  };
}

export interface DefinicaoSessaoColetiva {
  id: string;
  nome: string;
  pilar: PilarTreino;
  descricao: string;
  ganho_xp_atributos: Record<AtributoTreinoXp, number>;
  bonus_match_proximo_jogo: Record<string, number>;
  ganho_familiaridade_tatica: number;
  ganho_entrosamento: number;
  custo_energia: number;
  multiplicador_risco_lesao: number;
}

export interface DefinicaoPlanoIndividual {
  id: PlanoIndividualId;
  nome: string;
  atributo_alvo: AtributoTreinoXp | 'longevidade' | 'polivalencia';
  peso_distribuicao: Record<AtributoTreinoXp, number>;
  descricao: string;
}

export interface FaixaCurvaEtaria {
  idade_min: number;
  idade_max: number;
  multiplicador_evolucao: number;
  taxa_regressao_mensal: number;
}

export interface DefinicaoLesao {
  id: string;
  nome: string;
  gravidade: GravidadeLesaoTreino;
  rodadas_fora_base: number;
  perda_atributo_sem_medico: number;
}

export interface DatabaseTreinos {
  versao: string;
  descricao: string;
  regimes_intensidade: DefinicaoRegimeIntensidade[];
  sessoes_coletivas: DefinicaoSessaoColetiva[];
  planos_individuais: DefinicaoPlanoIndividual[];
  curva_evolucao_etaria: FaixaCurvaEtaria[];
  catalogo_lesoes: DefinicaoLesao[];
}

export interface EstadoTreinoJogador {
  jogador_id: number;
  plano_individual_id: PlanoIndividualId;
  xp_acumulado: Record<AtributoTreinoXp, number>;
  /** 0–100 — reduz penalidade de improvisação no motor. */
  progresso_polivalencia: number;
  lesao_ativa: {
    lesao_id: string;
    nome: string;
    gravidade: GravidadeLesaoTreino;
    rodadas_restantes: number;
    perda_pendente_alta: number;
  } | null;
}

export interface ProgramacaoTreinoClube {
  time_id: string;
  regime_id: RegimeIntensidadeId;
  sessao_principal_id: string;
  sessao_secundaria_id: string;
  familiaridade_formacoes: Record<string, number>;
  entrosamento_elenco: number;
}

/** Staff com efeitos numéricos para o motor de treinos. */
export interface ProfissionalCorpoTecnico {
  cargo: CargoStaff;
  nivel: number;
  efeitos: {
    multiplicador_fadiga_jogo: number;
    multiplicador_chance_lesao: number;
    multiplicador_tempo_fora: number;
    preservacao_atributos_pct: number;
  };
}

export const PESOS_OVERALL_POS_TREINO: Record<Posicao, [number, number, number, number]> = {
  GOL: [0.76, 0.14, 0.04, 0.06],
  ZAG: [0.6, 0.2, 0.05, 0.15],
  LAT: [0.35, 0.25, 0.1, 0.3],
  VOL: [0.4, 0.35, 0.1, 0.15],
  MEI: [0.1, 0.45, 0.25, 0.2],
  ATA: [0.05, 0.2, 0.45, 0.3],
};