import Dexie, { type Table } from 'dexie';
import { garantirAtributosJogador } from '../career/atributosJogador';
import { enriquecerElenco } from '../career/jogadorContratoInit';
import type {
  CampeonatoConfig,
  EstadoMeta,
  Jogador,
  JogoCalendario,
  LinhaTabela,
  SaveGamePayload,
  Time,
} from '../types/schema';
import type { EstadoComercial } from '../types/commercial';
import { publicPath } from '../publicPath';
import { carregarDatabaseTaticas, setDatabaseTaticas } from './tacticsDatabase';
import { carregarDatabaseTreinos, setDatabaseTreinos } from './trainingDatabase';
import type { DatabaseTaticas } from '../types/tactics';
import type { DatabaseTreinos } from '../types/training';
import type { EstadoTreinoJogador, ProgramacaoTreinoClube } from '../types/training';

/** Linha IndexedDB — chave primária = time_id. */
export type ComercialDexieRow = EstadoComercial;

class GVSManagerDB extends Dexie {
  campeonato!: Table<CampeonatoConfig, string>;
  times!: Table<Time, string>;
  jogadores!: Table<Jogador, number>;
  tabela!: Table<LinhaTabela, string>;
  calendario!: Table<JogoCalendario, number>;
  meta!: Table<EstadoMeta, string>;
  comercial!: Table<ComercialDexieRow, string>;
  treinos_jogadores!: Table<EstadoTreinoJogador & { time_id: string }, number>;
  programacao_treinos!: Table<ProgramacaoTreinoClube, string>;

  constructor() {
    super('GVSManagerDB_v1');

    this.version(1).stores({
      campeonato: 'id',
      times: 'id, nome, forca_geral',
      jogadores: 'id, time_id, posicao, overall, status_escalacao, [time_id+status_escalacao]',
      tabela: 'time_id, pontos, vitorias, saldo_gols',
      calendario: '++id, rodada, mandante_id, visitante_id, finalizado',
      meta: 'id',
    });

    this.version(2).stores({
      comercial: 'time_id',
    });

    this.version(3).stores({
      treinos_jogadores: 'jogador_id, time_id',
      programacao_treinos: 'time_id',
    });
  }
}

export const db = new GVSManagerDB();

function normalizarJogadores(jogadores: Jogador[], times: Time[]): Jogador[] {
  const porSlugOuId = new Map<string, string>();
  for (const t of times) {
    porSlugOuId.set(t.id, t.id);
    porSlugOuId.set(t.id.toLowerCase(), t.id);
    if (t.slug) {
      porSlugOuId.set(t.slug, t.id);
      porSlugOuId.set(t.slug.toLowerCase(), t.id);
    }
  }

  return jogadores.map((j) => {
    const bruto = j.time_id?.trim() ?? '';
    const time_id = bruto
      ? (porSlugOuId.get(bruto) ?? porSlugOuId.get(bruto.toLowerCase()) ?? bruto)
      : '';
    return garantirAtributosJogador({
      ...j,
      time_id,
      valor_mercado: j.valor_mercado ?? Math.round(j.overall * j.overall * 1200),
      salario_mensal: j.salario_mensal ?? Math.round(j.overall * 520),
      nacionalidade: j.nacionalidade ?? 'Brasil',
    });
  });
}

export async function carregarDatabaseInicial(): Promise<{
  campeonato: CampeonatoConfig;
  times: Time[];
  jogadores: Jogador[];
  taticas: DatabaseTaticas;
  treinos: DatabaseTreinos;
}> {
  const [campRes, timesRes, jogRes, taticas, treinos] = await Promise.all([
    fetch(publicPath('database/campeonato.json')),
    fetch(publicPath('database/times.json')),
    fetch(publicPath('database/jogadores.json')),
    carregarDatabaseTaticas(),
    carregarDatabaseTreinos(),
  ]);

  if (!campRes.ok || !timesRes.ok || !jogRes.ok) {
    throw new Error('Falha ao carregar os arquivos JSON em /public/database/.');
  }

  const [campeonato, times, jogadoresRaw] = (await Promise.all([
    campRes.json(),
    timesRes.json(),
    jogRes.json(),
  ])) as [CampeonatoConfig, Time[], Jogador[]];

  setDatabaseTaticas(taticas);
  setDatabaseTreinos(treinos);

  const jogadores = enriquecerElenco(normalizarJogadores(jogadoresRaw, times));

  await db.transaction('rw', [db.campeonato, db.times, db.jogadores], async () => {
    await db.campeonato.clear();
    await db.times.clear();
    await db.jogadores.clear();

    await db.campeonato.put({ ...campeonato, id: campeonato.id || 'atual' });
    await db.times.bulkPut(times);
    await db.jogadores.bulkPut(jogadores);
  });

  return { campeonato, times, jogadores, taticas, treinos };
}

export async function exportarSaveGame(): Promise<SaveGamePayload> {
  const [meta, tabela, calendario, elenco] = await Promise.all([
    db.meta.get('ativo'),
    db.tabela.toArray(),
    db.calendario.toArray(),
    db.jogadores.toArray(),
  ]);

  if (!meta) {
    throw new Error('Nenhum jogo ativo encontrado para salvar.');
  }

  const agora = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return {
    data_save: agora,
    time_usuario_id: meta.time_usuario_id,
    rodada_atual: meta.rodada_atual,
    tabela_classificacao: tabela,
    calendario_jogos: calendario,
    elenco_atualizado: elenco,
  };
}

export async function importarSaveGame(payload: SaveGamePayload): Promise<void> {
  if (!payload.time_usuario_id || !Array.isArray(payload.tabela_classificacao)) {
    throw new Error('Arquivo savegame.json inválido ou corrompido.');
  }

  await db.transaction('rw', [db.meta, db.tabela, db.calendario, db.jogadores], async () => {
    await db.meta.put({
      id: 'ativo',
      data_save: payload.data_save,
      time_usuario_id: payload.time_usuario_id,
      rodada_atual: payload.rodada_atual,
    });

    await db.tabela.clear();
    await db.tabela.bulkPut(payload.tabela_classificacao);

    await db.calendario.clear();
    await db.calendario.bulkPut(payload.calendario_jogos);

    if (payload.elenco_atualizado.length > 0) {
      await db.jogadores.bulkPut(payload.elenco_atualizado);
    }
  });
}