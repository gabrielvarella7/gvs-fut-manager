import type { EstadoTreinoJogador, ProgramacaoTreinoClube } from '../types/training';
import { db } from './database';

export interface ProgramacaoTreinoRow extends ProgramacaoTreinoClube {
  time_id: string;
}

export interface TreinoJogadorRow extends EstadoTreinoJogador {
  time_id: string;
}

export async function persistirTreinosDexie(
  timeId: string,
  programacao: ProgramacaoTreinoClube,
  estados: EstadoTreinoJogador[],
): Promise<void> {
  await db.transaction('rw', [db.programacao_treinos, db.treinos_jogadores], async () => {
    await db.programacao_treinos.put({ ...programacao, time_id: timeId });
    const rows: TreinoJogadorRow[] = estados.map((e) => ({
      ...e,
      time_id: timeId,
    }));
    const ids = estados.map((e) => e.jogador_id);
    const antigos = await db.treinos_jogadores.where('time_id').equals(timeId).toArray();
    const remover = antigos.filter((a) => !ids.includes(a.jogador_id));
    for (const r of remover) {
      await db.treinos_jogadores.delete(r.jogador_id);
    }
    await db.treinos_jogadores.bulkPut(rows);
  });
}

export async function carregarTreinosDexie(timeId: string): Promise<{
  programacao: ProgramacaoTreinoClube | null;
  estados: EstadoTreinoJogador[];
}> {
  const programacao = (await db.programacao_treinos.get(timeId)) ?? null;
  const estados = await db.treinos_jogadores.where('time_id').equals(timeId).toArray();
  return {
    programacao: programacao ? { ...programacao } : null,
    estados: estados.map(({ time_id: _, ...rest }) => rest),
  };
}