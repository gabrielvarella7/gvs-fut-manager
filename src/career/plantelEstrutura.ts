import { criarRng } from '../engine/matchEngine';
import type { Jogador, Posicao } from '../types/schema';

/** Campos mínimos para calibrar OVR dos extras (Time completo ou fictício). */
export type TimeForcaRef = {
  id: string;
  forca_geral?: number;
  prestigio?: number;
  forca?: number;
};
import { gerarAtributosNovos, overallDeAtributos } from './atributosJogador';
import { gerarGeneticaAtleta } from './genetica';
import {
  FORA_DA_LISTA_ALVO,
  RESERVAS_PARTIDA,
  TAMANHO_ELENCO_ESTRUTURA,
  TITULARES_PARTIDA,
} from './lineup';

/**
 * Distribuição de profundidade para completar até 30:
 * base 22 (2/4/4/3/5/4) + 8 extras (1/1/1/1/2/2).
 */
export const COTAS_PLANTEL_30: ReadonlyArray<readonly [Posicao, number]> = [
  ['GOL', 3],
  ['ZAG', 5],
  ['LAT', 5],
  ['VOL', 4],
  ['MEI', 7],
  ['ATA', 6],
];

/** Ordem de slots para elenco gerado (tamanho = TAMANHO_ELENCO_ESTRUTURA). */
export const SLOTS_PLANTEL_30: Posicao[] = COTAS_PLANTEL_30.flatMap(([pos, n]) =>
  Array.from({ length: n }, () => pos),
);

export function statusEscalacaoPorSlot(slotIndex0: number): Jogador['status_escalacao'] {
  if (slotIndex0 < TITULARES_PARTIDA) return 'TITULAR';
  if (slotIndex0 < TITULARES_PARTIDA + RESERVAS_PARTIDA) return 'RESERVA';
  return 'NAO_RELACIONADO';
}

function contagemPorPosicao(elenco: Jogador[]): Record<Posicao, number> {
  const acc: Record<Posicao, number> = {
    GOL: 0,
    ZAG: 0,
    LAT: 0,
    VOL: 0,
    MEI: 0,
    ATA: 0,
  };
  for (const j of elenco) acc[j.posicao] += 1;
  return acc;
}

/** Próxima posição em falta vs cotas 30; fallback ATA. */
export function proximaPosicaoEmFalta(elenco: Jogador[]): Posicao {
  const atual = contagemPorPosicao(elenco);
  for (const [pos, alvo] of COTAS_PLANTEL_30) {
    if (atual[pos] < alvo) return pos;
  }
  return 'ATA';
}

function mediaOvr(elenco: Jogador[]): number {
  if (elenco.length === 0) return 68;
  return elenco.reduce((s, j) => s + j.overall, 0) / elenco.length;
}

/**
 * Completa o plantel de cada clube até 30 (11+11+8), sem ultrapassar o teto.
 * Novos atletas entram como NAO_RELACIONADO (fora da lista).
 * Clubs already ≥30 are left untouched. `time_id` nulo/inválido é ignorado.
 */
export function completarElencoEstrutura30(
  jogadores: Jogador[],
  times: TimeForcaRef[] | null | undefined = null,
): Jogador[] {
  const porClube = new Map<string, Jogador[]>();
  for (const j of jogadores) {
    const tid = j.time_id;
    if (!tid || tid === 'null') continue;
    const lista = porClube.get(tid) ?? [];
    lista.push(j);
    porClube.set(tid, lista);
  }

  const forcaPorTime = new Map<string, number>();
  if (times) {
    for (const t of times) {
      forcaPorTime.set(t.id, t.forca_geral ?? t.prestigio ?? t.forca ?? 72);
    }
  }

  let maxId = jogadores.reduce((m, j) => Math.max(m, j.id), 0);
  const extras: Jogador[] = [];

  for (const [timeId, elenco] of porClube) {
    const teto = TAMANHO_ELENCO_ESTRUTURA;
    if (elenco.length >= teto) continue;

    const forca = forcaPorTime.get(timeId) ?? mediaOvr(elenco);
    const seed =
      timeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ^ (elenco.length * 9973);
    const rnd = criarRng(seed >>> 0);
    let faltam = teto - elenco.length;
    const working = [...elenco];

    while (faltam > 0) {
      maxId += 1;
      const pos = proximaPosicaoEmFalta(working);
      // Profundidade: um pouco abaixo da média do plantel.
      const base = Math.max(52, forca - 6 - rnd() * 8);
      const idade = 18 + Math.floor(rnd() * 16);
      const atributos = gerarAtributosNovos(pos, base, maxId, idade, rnd);
      const overall = overallDeAtributos(pos, atributos);
      const novo: Jogador = {
        id: maxId,
        time_id: timeId,
        nome: `Atleta ${pos} ${working.length + 1}`,
        idade,
        posicao: pos,
        atributos,
        overall,
        energia: 100,
        status_escalacao: 'NAO_RELACIONADO',
        valor_mercado: overall * overall * 600,
        salario_mensal: Math.round(overall * 350 + rnd() * 1500),
        nacionalidade: 'Brasil',
        genetica: gerarGeneticaAtleta({ id: maxId, idade, overall, rnd }),
      };
      working.push(novo);
      extras.push(novo);
      faltam -= 1;
    }
  }

  if (extras.length === 0) return jogadores;
  return [...jogadores, ...extras];
}

/**
 * Quantos devem ficar fora da lista após relacionar 11+11,
 * limitado pelo tamanho real do elenco.
 */
export function alvoForaDaLista(tamanhoElenco: number): number {
  if (tamanhoElenco <= 0) return 0;
  const relacionados = TITULARES_PARTIDA + RESERVAS_PARTIDA;
  if (tamanhoElenco <= relacionados) return 0;
  const sobra = tamanhoElenco - relacionados;
  if (tamanhoElenco >= TAMANHO_ELENCO_ESTRUTURA) {
    return Math.min(FORA_DA_LISTA_ALVO, sobra);
  }
  return sobra;
}

/** Migra elencos fictícios antigos (&lt;30) para a estrutura 11+11+8. */
export function completarTimesFicticiosEstrutura30<
  T extends { id: string; forca: number; jogadores: Jogador[] },
>(times: T[]): T[] {
  return times.map((t) => {
    if (t.jogadores.length >= TAMANHO_ELENCO_ESTRUTURA) return t;
    const jogadores = completarElencoEstrutura30(t.jogadores, [
      { id: t.id, forca: t.forca },
    ]);
    return { ...t, jogadores };
  });
}
