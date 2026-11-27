import type { Lancamento, MatchSimResult } from '../engine/matchEngine';

/** Amarelos acumulados para suspensão: a cada 3 → 1 jogo fora. */
export const AMARELOS_PARA_SUSPENSAO = 3;
/** Vermelho (direto ou 2º amarelo) → 1 jogo fora. */
export const JOGOS_SUSPENSAO_VERMELHO = 1;
export const JOGOS_SUSPENSAO_AMARELOS = 1;

export interface DesempenhoJogadorPartida {
  jogadorId: number;
  timeId: string;
  gols: number;
  /** Amarelos que contam na acumulação da temporada (0 se houve expulsão na partida). */
  amarelos: number;
  /** Expulsão por vermelho direto ou segundo amarelo. */
  vermelho: boolean;
}

export interface EstadoDisciplinaJogador {
  amarelos: number;
  jogosSuspenso: number;
}

export type MapaDisciplina = Record<number, EstadoDisciplinaJogador>;

/**
 * Regras de cartão na partida:
 * - 2 amarelos = vermelho; amarelos daquela partida não entram na acumulação.
 * - Vermelho direto = expulsão; amarelos da partida zerados para acumulação.
 * - Amarelo isolado conta +1 na temporada.
 */
export function classificarCartoesNaPartida(
  lancamentos: Lancamento[],
  jogadorId: number,
): { amarelos: number; vermelho: boolean } {
  const cartoes = lancamentos.filter(
    (l) => l.tipo === 'cartao_amarelo' && l.jogadorId === jogadorId,
  );
  if (cartoes.length === 0) return { amarelos: 0, vermelho: false };

  const expulso =
    cartoes.length >= 2 ||
    cartoes.some((c) => c.expulsao === true || /expuls[aã]o/i.test(c.texto));

  if (expulso) {
    // Contam só como expulsão — zeram amarelos daquela partida.
    return { amarelos: 0, vermelho: true };
  }
  return { amarelos: cartoes.length, vermelho: false };
}

export function extrairDesempenhoPartida(result: MatchSimResult): DesempenhoJogadorPartida[] {
  const porJogador = new Map<number, DesempenhoJogadorPartida>();

  const ensure = (jogadorId: number, timeId: string): DesempenhoJogadorPartida => {
    let row = porJogador.get(jogadorId);
    if (!row) {
      row = { jogadorId, timeId, gols: 0, amarelos: 0, vermelho: false };
      porJogador.set(jogadorId, row);
    }
    return row;
  };

  for (const l of result.lancamentos) {
    if (l.tipo === 'gol' && l.jogadorId != null && l.timeId) {
      ensure(l.jogadorId, l.timeId).gols += 1;
    }
  }

  const idsCartoes = new Set<number>();
  for (const l of result.lancamentos) {
    if (l.tipo === 'cartao_amarelo' && l.jogadorId != null && l.timeId) {
      idsCartoes.add(l.jogadorId);
      ensure(l.jogadorId, l.timeId);
    }
  }

  for (const id of idsCartoes) {
    const row = porJogador.get(id)!;
    const cartoes = classificarCartoesNaPartida(result.lancamentos, id);
    row.amarelos = cartoes.amarelos;
    row.vermelho = cartoes.vermelho;
  }

  return [...porJogador.values()];
}

function ensureDisc(mapa: MapaDisciplina, jogadorId: number): EstadoDisciplinaJogador {
  const atual = mapa[jogadorId];
  if (atual) return atual;
  const novo = { amarelos: 0, jogosSuspenso: 0 };
  mapa[jogadorId] = novo;
  return novo;
}

/**
 * Consome 1 jogo de suspensão para quem ainda está suspenso e cujo time jogou.
 * Deve rodar antes de aplicar cartões da partida.
 */
export function consumirSuspensoesDaPartida(
  disciplina: MapaDisciplina,
  timeIdsQueJogaram: string[],
  desempenho: DesempenhoJogadorPartida[],
  elencoPorTime: Map<string, number[]>,
): MapaDisciplina {
  const next: MapaDisciplina = { ...disciplina };
  for (const [id, estado] of Object.entries(disciplina)) {
    const jogadorId = Number(id);
    if (!estado || estado.jogosSuspenso <= 0) continue;
    const noElenco = timeIdsQueJogaram.some((tid) =>
      (elencoPorTime.get(tid) ?? []).includes(jogadorId),
    );
    // Também consome se o jogador aparece no desempenho (improvável se suspenso).
    const noDesempenho = desempenho.some((d) => d.jogadorId === jogadorId);
    if (noElenco || noDesempenho) {
      const e = ensureDisc(next, jogadorId);
      next[jogadorId] = { ...e, jogosSuspenso: Math.max(0, e.jogosSuspenso - 1) };
    }
  }
  return next;
}

/**
 * Aplica cartões da partida à disciplina da temporada.
 * 3 amarelos → 1 jogo fora (amarelos -= 3); vermelho → 1 jogo fora.
 */
export function aplicarCartoesPartida(
  disciplina: MapaDisciplina,
  desempenho: DesempenhoJogadorPartida[],
): MapaDisciplina {
  const next: MapaDisciplina = { ...disciplina };
  for (const d of desempenho) {
    const e = { ...ensureDisc(next, d.jogadorId) };
    if (d.amarelos > 0) {
      e.amarelos += d.amarelos;
      while (e.amarelos >= AMARELOS_PARA_SUSPENSAO) {
        e.amarelos -= AMARELOS_PARA_SUSPENSAO;
        e.jogosSuspenso += JOGOS_SUSPENSAO_AMARELOS;
      }
    }
    if (d.vermelho) {
      e.jogosSuspenso += JOGOS_SUSPENSAO_VERMELHO;
    }
    next[d.jogadorId] = e;
  }
  return next;
}

/** Reconstrói disciplina a partir do histórico (partidas já finalizadas, em ordem). */
export function reconstruirDisciplina(
  partidas: {
    finalizado: boolean;
    mandanteId: string;
    visitanteId: string;
    desempenhoJogadores?: DesempenhoJogadorPartida[];
  }[],
  elencoPorTime: Map<string, number[]>,
): MapaDisciplina {
  let mapa: MapaDisciplina = {};
  const ordenadas = partidas.filter((p) => p.finalizado);
  for (const p of ordenadas) {
    const desempenho = p.desempenhoJogadores ?? [];
    mapa = consumirSuspensoesDaPartida(
      mapa,
      [p.mandanteId, p.visitanteId],
      desempenho,
      elencoPorTime,
    );
    mapa = aplicarCartoesPartida(mapa, desempenho);
  }
  return mapa;
}

export function jogadoresSuspensos(
  disciplina: MapaDisciplina,
  _timeId: string,
  elencoIds: number[],
): number[] {
  return elencoIds.filter((id) => (disciplina[id]?.jogosSuspenso ?? 0) > 0);
}
