import { publicPath } from '../publicPath';
import type { DatabaseTreinos } from '../types/training';

let cache: DatabaseTreinos | null = null;

export async function carregarDatabaseTreinos(): Promise<DatabaseTreinos> {
  const res = await fetch(publicPath('database/treinos.json'));
  if (!res.ok) {
    throw new Error('Falha ao carregar public/database/treinos.json');
  }
  const data = (await res.json()) as DatabaseTreinos;
  cache = data;
  return data;
}

export function setDatabaseTreinos(db: DatabaseTreinos): void {
  cache = db;
}

export function getDatabaseTreinos(): DatabaseTreinos {
  if (!cache) {
    throw new Error('Base de treinos ainda não carregada.');
  }
  return cache;
}

export function tryGetDatabaseTreinos(): DatabaseTreinos | null {
  return cache;
}