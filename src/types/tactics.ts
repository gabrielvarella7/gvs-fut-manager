import type { Posicao } from './schema';

export type CategoriaFormacao =
  | 'OFENSIVA'
  | 'POSICIONAL'
  | 'EQUILIBRADA'
  | 'CENTRALIZADA'
  | 'TRANSICAO'
  | 'ULTRA_OFENSIVA'
  | 'DEFENSIVA'
  | 'ULTRA_DEFENSIVA';

export type EstiloJogoId =
  | 'GEGENPRESSING'
  | 'TIKI_TAKA'
  | 'CONTRA_ATAQUE_DIRETO'
  | 'JOGO_PELAS_PONTAS'
  | 'RETRANCADO_CATIMBA'
  | 'VERTICAL_OBJETIVO';

export type AlturaLinha = 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';
export type IntensidadeMarcacao = 'CONTER' | 'EQUILIBRADA' | 'PRESSAO_ALTA' | 'SUFOCANTE';
export type RitmoJogo = 'LENTO_CADENCIADO' | 'NORMAL' | 'ACELERADO';
export type LarguraAtaque = 'FUNIL_CENTRAL' | 'EQUILIBRADA' | 'BEM_ABERTO';
export type FocoPasses = 'MISTO' | 'CURTOS_NO_PE' | 'BOLAS_LONGAS';

export type AtributoExigenciaEstilo =
  | 'passe'
  | 'velocidade'
  | 'defesa'
  | 'chute'
  | 'energia_inicial';

export interface ModificadoresTaticos {
  posse_bola: number;
  criacao_jogadas: number;
  eficiencia_finalizacao: number;
  solidez_defensiva: number;
  perigo_contra_ataque: number;
  vulnerabilidade_contra_ataque: number;
  jogo_aereo_ofensivo: number;
  jogo_aereo_defensivo: number;
  desgaste_fisico: number;
  incidencia_faltas: number;
}

export interface DefinicaoFormacao {
  id: string;
  nome: string;
  categoria: CategoriaFormacao;
  cotas_posicao: Record<Posicao, number>;
  descricao: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
  atributos_chave: string[];
  modificadores_base: Partial<ModificadoresTaticos>;
  vantagem_contra: string[];
  desvantagem_contra: string[];
}

export interface DefinicaoEstiloJogo {
  id: EstiloJogoId;
  nome: string;
  descricao: string;
  modificadores: Partial<ModificadoresTaticos>;
  exigencia_minima: Partial<Record<AtributoExigenciaEstilo, number>>;
  eficaz_contra_estilos: EstiloJogoId[];
  sofre_contra_estilos: EstiloJogoId[];
}

export interface InstrucoesColetivas {
  altura_linha: AlturaLinha;
  intensidade_marcacao: IntensidadeMarcacao;
  ritmo_jogo: RitmoJogo;
  largura_ataque: LarguraAtaque;
  foco_passes: FocoPasses;
}

export interface ConfiguracaoTaticaClube {
  formacao_id: string;
  estilo_jogo_id: EstiloJogoId;
  instrucoes: InstrucoesColetivas;
}

export interface DatabaseTaticas {
  versao: string;
  descricao: string;
  formacoes: DefinicaoFormacao[];
  estilos_jogo: DefinicaoEstiloJogo[];
  instrucoes_coletivas: {
    altura_linha: Record<AlturaLinha, Partial<ModificadoresTaticos>>;
    intensidade_marcacao: Record<IntensidadeMarcacao, Partial<ModificadoresTaticos>>;
    ritmo_jogo: Record<RitmoJogo, Partial<ModificadoresTaticos>>;
    largura_ataque: Record<LarguraAtaque, Partial<ModificadoresTaticos>>;
    foco_passes: Record<FocoPasses, Partial<ModificadoresTaticos>>;
  };
}

export const INSTRUCOES_PADRAO: InstrucoesColetivas = {
  altura_linha: 'MEDIA',
  intensidade_marcacao: 'EQUILIBRADA',
  ritmo_jogo: 'NORMAL',
  largura_ataque: 'EQUILIBRADA',
  foco_passes: 'MISTO',
};