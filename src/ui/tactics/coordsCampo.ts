import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../../data/esquemasTaticos';
import type { EsquemaTatico, Posicao } from '../../types/schema';

const Y_POR_POS: Record<Posicao, number> = {
  GOL: 88,
  ZAG: 74,
  LAT: 70,
  VOL: 54,
  MEI: 40,
  ATA: 22,
};

export type PontoCampo = { x: number; y: number };

/** Coordenadas em % (0–100) de cima (ataque) para baixo (goleiro). */
export function coordsEsquema(esquema: EsquemaTatico): PontoCampo[] {
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const coords: PontoCampo[] = new Array(slots.length);

  const porLinha = new Map<number, number[]>();
  slots.forEach((pos, idx) => {
    const y = Y_POR_POS[pos];
    const lista = porLinha.get(y) ?? [];
    lista.push(idx);
    porLinha.set(y, lista);
  });

  for (const [y, indices] of porLinha.entries()) {
    const n = indices.length;
    indices.forEach((slotIdx, i) => {
      const x = n === 1 ? 50 : 12 + (i / Math.max(1, n - 1)) * 76;
      coords[slotIdx] = { x, y };
    });
  }

  return coords;
}

export function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] ?? nome;
  return p.length > 12 ? `${p.slice(0, 11)}…` : p;
}