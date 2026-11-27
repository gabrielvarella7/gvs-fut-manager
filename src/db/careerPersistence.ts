import type { EstadoTemporada, PartidaCampeonato } from '../career/brasileirao';
import type { Jogador, JogoCalendario, LinhaTabela } from '../types/schema';
import { db } from './database';

/** Bônus residual na virada de rodada (recuperação principal é diária por idade). */
const RECUPERACAO_RESERVA_RODADA = 4;

export function partidasParaCalendario(partidas: PartidaCampeonato[]): JogoCalendario[] {
  return partidas.map((p) => ({
    id: p.id,
    rodada: p.rodada,
    mandante_id: p.mandanteId,
    visitante_id: p.visitanteId,
    gols_mandante: p.finalizado ? (p.golsMandante ?? null) : null,
    gols_visitante: p.finalizado ? (p.golsVisitante ?? null) : null,
    finalizado: p.finalizado,
  }));
}

export async function sincronizarCarreiraDexie(opts: {
  brasileirao: EstadoTemporada;
  clubeRealId: string;
}): Promise<void> {
  const dataSave = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await db.transaction('rw', [db.meta, db.tabela, db.calendario], async () => {
    await db.meta.put({
      id: 'ativo',
      data_save: dataSave,
      time_usuario_id: opts.clubeRealId,
      rodada_atual: opts.brasileirao.rodadaAtual,
    });
    await db.tabela.clear();
    await db.tabela.bulkPut(opts.brasileirao.tabela as LinhaTabela[]);
    await db.calendario.clear();
    await db.calendario.bulkPut(partidasParaCalendario(opts.brasileirao.partidas));
  });
}

/** Aplica fadiga dos titulares que disputaram a partida (ids em energiaFinal). */
export function aplicarFadigaPosPartida(
  jogadores: Jogador[],
  energiaFinal: { id: number; energia: number }[],
  dataPartidaISO?: string,
): Jogador[] {
  const mapa = new Map(energiaFinal.map((e) => [e.id, e.energia]));
  const iso = dataPartidaISO ?? new Date().toISOString().slice(0, 10);
  return jogadores.map((j) =>
    mapa.has(j.id)
      ? {
          ...j,
          energia: Math.round(mapa.get(j.id)! * 10) / 10,
          ultimaPartidaISO: iso,
        }
      : j,
  );
}

/** Monta lista de jogadores com energia pós-jogo para bulkPut no IndexedDB. */
export function jogadoresAtualizadosPosPartida(
  jogadores: Jogador[],
  energiaFinal: { id: number; energia: number }[],
): Jogador[] {
  return aplicarFadigaPosPartida(jogadores, energiaFinal);
}

export async function persistirJogadoresDexie(jogadores: Jogador[]): Promise<void> {
  await db.jogadores.bulkPut(jogadores);
}

/** Pequeno reforço para reservas na virada de rodada (calendário diário faz o grosso). */
export function recuperarReservasViradaRodada(jogadores: Jogador[]): Jogador[] {
  return jogadores.map((j) => {
    if (j.status_escalacao === 'TITULAR') return j;
    return {
      ...j,
      energia: Math.min(
        100,
        Math.round((j.energia + RECUPERACAO_RESERVA_RODADA) * 10) / 10,
      ),
    };
  });
}

export function rodadaEncerradaNoEstado(
  estado: EstadoTemporada,
  rodada: number,
): boolean {
  return estado.partidas
    .filter((p) => p.rodada === rodada)
    .every((p) => p.finalizado);
}