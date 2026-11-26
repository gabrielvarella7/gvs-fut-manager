import { publicPath } from '../publicPath';
import type { DatabaseTaticas } from '../types/tactics';

let cache: DatabaseTaticas | null = null;

export async function carregarDatabaseTaticas(): Promise<DatabaseTaticas> {
  const res = await fetch(publicPath('database/taticas.json'));
  if (!res.ok) {
    throw new Error('Falha ao carregar public/database/taticas.json');
  }
  const data = (await res.json()) as DatabaseTaticas;
  cache = data;
  return data;
}

export function setDatabaseTaticas(db: DatabaseTaticas): void {
  cache = db;
}

export function getDatabaseTaticas(): DatabaseTaticas {
  if (!cache) {
    throw new Error('Base de táticas ainda não carregada.');
  }
  return cache;
}

export function tryGetDatabaseTaticas(): DatabaseTaticas | null {
  return cache;
}