import type { AtributosJogador, GeneticaJogador, LinhaTabela, Posicao } from './schema';
import type { TierCategoriaBase } from './mundoClube';
import type { PartidaCampeonato } from '../career/brasileirao';

/** Tamanho fixo do elenco Sub-23 por clube. */
export const TAMANHO_ELENCO_SUB23 = 22;

/** Teto do plantel profissional (Sub-23 → pro). */
export const TETO_PLANTEL_PRO_SUB23 = 30;

export const MSG_PLANTEL_CHEIO_SUBIR =
  'Plantel cheio, para subir um atleta precisa vender ou dispensar alguém.';

/** Nome padrão da competição espelhada do Brasileirão no Sub-23. */
export const NOME_COMPETICAO_SUB23 = 'Brasileirão Sub23';

/** Acrescenta o sufixo Sub23 ao nome da competição profissional. */
export function rotuloCompeticaoSub23(nomeBase?: string | null): string {
  const base = (nomeBase ?? 'Brasileirão').replace(/\s*Sub-?23\s*$/i, '').trim() || 'Brasileirão';
  return `${base} Sub23`;
}
export interface AtletaSub23 {
  id: number;
  time_id: string;
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
  /** Rodada em que entrou no Sub-23. */
  entradaRodada: number;
}

export interface EstadoAspirantesS23 {
  temporadaAno: number;
  rodadaAtual: number;
  partidas: PartidaCampeonato[];
  tabela: LinhaTabela[];
  /** Elencos Sub-23 por clube (sempre 22). */
  elencos: Record<string, AtletaSub23[]>;
  /** Última rodada do Brasileirão em que o S23 foi sincronizado. */
  ultimaRodadaBrSync?: number;
}

export interface OfertaDispensa {
  jogadorId: number;
  mesesRestantes: number;
  salarioMensal: number;
  /** Acordo amigável: 50% dos salários restantes. */
  valorAcordo: number;
  /** Rescisão unilateral: 100% dos salários restantes. */
  valorIntegral: number;
  mensagem: string;
}

export type ResultadoDispensa =
  | { ok: true; modo: 'ACORDO' | 'INTEGRAL'; custo: number; mensagem: string }
  | { ok: false; motivo: string; oferta?: OfertaDispensa };
