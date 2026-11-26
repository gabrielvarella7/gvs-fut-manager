import type { EstadoComercial } from '../types/commercial';
import { db } from './database';

export async function persistirComercialDexie(estado: EstadoComercial): Promise<void> {
  await db.comercial.put(estado);
}

export async function carregarComercialDexie(timeId: string): Promise<EstadoComercial | null> {
  return (await db.comercial.get(timeId)) ?? null;
}

export async function removerComercialDexie(timeId: string): Promise<void> {
  await db.comercial.delete(timeId);
}