import {
  LEGENDAS_PAULO_ANDRADE,
  type CategoriaNarracao,
} from '../data/legendasPauloAndrade';
import type { Jogador, Posicao } from '../types/schema';

export interface VarsNarracao {
  MANDANTE: string;
  VISITANTE: string;
  TIME_ATAQUE: string;
  TIME_DEFESA: string;
  JOGADOR: string;
  ASSISTENTE: string;
  GOLEIRO: string;
  ESTADIO: string;
  MINUTO: string;
  PLACAR: string;
}

export function substituirVariaveis(modelo: string, vars: VarsNarracao): string {
  return modelo
    .replaceAll('{MANDANTE}', vars.MANDANTE)
    .replaceAll('{VISITANTE}', vars.VISITANTE)
    .replaceAll('{TIME_ATAQUE}', vars.TIME_ATAQUE)
    .replaceAll('{TIME_DEFESA}', vars.TIME_DEFESA)
    .replaceAll('{JOGADOR}', vars.JOGADOR)
    .replaceAll('{ASSISTENTE}', vars.ASSISTENTE)
    .replaceAll('{GOLEIRO}', vars.GOLEIRO)
    .replaceAll('{ESTADIO}', vars.ESTADIO)
    .replaceAll('{MINUTO}', vars.MINUTO)
    .replaceAll('{PLACAR}', vars.PLACAR);
}

export function escolherLegenda(
  categoria: CategoriaNarracao,
  rnd: () => number,
  vars: VarsNarracao,
): string {
  const lista = LEGENDAS_PAULO_ANDRADE[categoria];
  const idx = Math.floor(rnd() * lista.length);
  return substituirVariaveis(lista[idx] ?? lista[0], vars);
}

/** Sorteia só entre os índices [inicio, fim] da lista da categoria (inclusivo). */
export function escolherLegendaEntre(
  categoria: CategoriaNarracao,
  rnd: () => number,
  vars: VarsNarracao,
  inicio: number,
  fim: number,
): string {
  const lista = LEGENDAS_PAULO_ANDRADE[categoria];
  const fatia = lista.slice(inicio, fim + 1);
  const idx = Math.floor(rnd() * fatia.length);
  return substituirVariaveis(fatia[idx] ?? fatia[0] ?? lista[0], vars);
}

type EmCampo = { jogador: Jogador; posicaoEscalada: Posicao };

export function nomeGoleiro(escalacao: EmCampo[]): string {
  return (
    escalacao.find((e) => e.posicaoEscalada === 'GOL')?.jogador.nome ?? 'goleiro'
  );
}

export function placarAte(
  minuto: number,
  minutosGolM: number[],
  minutosGolV: number[],
): string {
  const gm = minutosGolM.filter((m) => m <= minuto).length;
  const gv = minutosGolV.filter((m) => m <= minuto).length;
  return `${gm} x ${gv}`;
}

export function pickAssistente(
  escalacao: EmCampo[],
  autorId: number,
  rnd: () => number,
): string {
  const candidatos = escalacao
    .map((e) => e.jogador)
    .filter((j) => j.id !== autorId);
  if (candidatos.length === 0) return 'companheiro';
  return candidatos[Math.floor(rnd() * candidatos.length)].nome;
}

export function categoriaGol(rnd: () => number, comAssistente: boolean): CategoriaNarracao {
  const r = rnd();
  if (r < 0.12) return 'golaco';
  if (comAssistente && r < 0.22) return 'bola_parada';
  return 'gol';
}