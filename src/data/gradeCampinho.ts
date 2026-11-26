import {
  coordsReferenciaCampinho,
  layoutCampinho,
  type LinhaCampinho,
  type PontoCampo,
} from './campinhoLayout';
import type { EsquemaTatico, Posicao } from '../types/schema';

/**
 * Linha horizontal com 5 células: ponta (0) · trio (1–2–3) · ponta (4).
 * Mesma simetria em todas as táticas (modelo tactical-board).
 */
export const COLS_LINHA = 5;
export const LINHAS_CAMPO = 5;

export type CelulaGrade = { col: number; row: number; gol?: boolean };

export const ROW_Y = [12, 28, 44, 60, 76] as const;

/** Pontas na largura; trio (col 1–2–3) compacto em torno do centro. */
export const COL_X_GRADE = [14, 36, 50, 64, 86] as const;

export const GOL_PONTO: PontoCampo = { x: 50, y: 91 };

const LINHA_PARA_ROW: Record<LinhaCampinho, number | null> = {
  ATA: 0,
  MO: 1,
  MC: 2,
  VOL: 3,
  DEF: 4,
  GOL: null,
};

/**
 * Distribuição fixa por quantidade (ordem dos slots = esquerda → direita no layout).
 */
export function colunasNaLinha5(quantidade: number, posicoes: Posicao[] = []): number[] {
  const n = Math.max(1, Math.min(5, quantidade));
  if (n === 1) return [2];
  if (n === 5) return [0, 1, 2, 3, 4];
  if (n === 4) return [0, 1, 3, 4];
  if (n === 3) {
    if (posicoes.every((p) => p === 'ATA')) return [0, 2, 4];
    return [1, 2, 3];
  }
  if (n === 2) {
    if (posicoes.every((p) => p === 'LAT')) return [0, 4];
    if (posicoes.every((p) => p === 'ATA')) return [1, 3];
    return [1, 3];
  }
  return [2];
}

export function ehCelulaGol(a: CelulaGrade, b: CelulaGrade): boolean {
  return !!a.gol && !!b.gol;
}

/** Posição mostrada no campinho conforme a faixa (e coluna na defesa). */
export function posicaoNaCelula(c: CelulaGrade): Posicao {
  if (c.gol) return 'GOL';
  if (c.row === 4) {
    if (c.col === 0 || c.col === 4) return 'LAT';
    return 'ZAG';
  }
  if (c.row === 3) return 'VOL';
  if (c.row === 0) return 'ATA';
  if (c.row === 1 || c.row === 2) return 'MEI';
  return 'MEI';
}

/** Siglas na bolinha (faixa + coluna). */
export function rotuloPosicaoCampinho(c: CelulaGrade): string {
  if (c.gol) return 'GOL';
  if (c.row === 4 && c.col === 0) return 'LE';
  if (c.row === 4 && c.col === 4) return 'LD';
  if (c.row === 4) return 'ZAG';
  if (c.row === 3 && c.col === 0) return 'AE';
  if (c.row === 3 && c.col === 4) return 'AD';
  if (c.row === 3) return 'VOL';
  if (c.row === 0 && c.col === 0) return 'PE';
  if (c.row === 0 && c.col === 4) return 'PD';
  if (c.row === 0 && c.col === 2) return 'CA';
  if (c.row === 0 && c.col === 1) return 'AE';
  if (c.row === 0 && c.col === 3) return 'AD';
  if (c.row === 0) return 'ATA';
  if (c.row === 1 && c.col === 0) return 'PE';
  if (c.row === 1 && c.col === 4) return 'PD';
  if (c.row === 1 && c.col === 1) return 'AE';
  if (c.row === 1 && c.col === 3) return 'AD';
  if (c.row === 1 && c.col === 2) return 'MC';
  if (c.row === 1) return 'MO';
  if (c.row === 2 && c.col === 0) return 'AE';
  if (c.row === 2 && c.col === 4) return 'AD';
  if (c.row === 2 && c.col === 1) return 'ME';
  if (c.row === 2 && c.col === 3) return 'MD';
  if (c.row === 2) return 'MC';
  return posicaoNaCelula(c).slice(0, 3);
}

export function mesmaCelula(a: CelulaGrade, b: CelulaGrade): boolean {
  if (a.gol || b.gol) return ehCelulaGol(a, b);
  return a.col === b.col && a.row === b.row;
}

export function pontoCelula(c: CelulaGrade): PontoCampo {
  if (c.gol) return { ...GOL_PONTO };
  const col = Math.max(0, Math.min(COLS_LINHA - 1, c.col));
  const row = Math.max(0, Math.min(LINHAS_CAMPO - 1, c.row));
  return { x: COL_X_GRADE[col], y: ROW_Y[row] };
}

export function coordsDeGrade(celulas: CelulaGrade[]): PontoCampo[] {
  return celulas.map(pontoCelula);
}

export function celulaMaisProxima(x: number, y: number): CelulaGrade {
  let melhor: CelulaGrade = { col: 2, row: 2 };
  let menor = Infinity;
  for (let row = 0; row < LINHAS_CAMPO; row++) {
    for (let col = 0; col < COLS_LINHA; col++) {
      const d = Math.hypot(x - COL_X_GRADE[col], y - ROW_Y[row]);
      if (d < menor) {
        menor = d;
        melhor = { col, row };
      }
    }
  }
  return melhor;
}

export function celulaGoleiro(): CelulaGrade {
  return { col: 2, row: 0, gol: true };
}

/** Aplica pontas + trio em cada faixa tática do esquema. */
export function realinharSimetriaGrade(
  grade: CelulaGrade[],
  esquema: EsquemaTatico,
): CelulaGrade[] {
  const slots = layoutCampinho(esquema);
  const next = grade.map((c) => ({ ...c }));

  for (let i = 0; i < 11; i++) {
    if (slots[i].pos === 'GOL') {
      next[i] = celulaGoleiro();
    }
  }

  const porLinha = new Map<number, number[]>();
  for (let i = 0; i < 11; i++) {
    if (next[i].gol) continue;
    const row = LINHA_PARA_ROW[slots[i].linha];
    if (row == null) continue;
    const lista = porLinha.get(row) ?? [];
    lista.push(i);
    porLinha.set(row, lista);
  }

  for (const [row, indices] of porLinha) {
    indices.sort((a, b) => a - b);
    const posicoes = indices.map((i) => slots[i].pos);
    const cols = colunasNaLinha5(indices.length, posicoes);
    indices.forEach((idx, j) => {
      next[idx] = { col: cols[j] ?? 2, row };
    });
  }

  return next;
}

export function gradePadrao(esquema: EsquemaTatico): CelulaGrade[] {
  const slots = layoutCampinho(esquema);
  const ref = coordsReferenciaCampinho(esquema);
  if (ref?.length === 11) {
    return slots.map((s, i) => {
      if (s.pos === 'GOL') return celulaGoleiro();
      const p = ref[i]!;
      const cel = celulaMaisProxima(p.x, p.y);
      return { col: cel.col, row: cel.row };
    });
  }
  const rascunho: CelulaGrade[] = slots.map((s) => {
    if (s.pos === 'GOL') return celulaGoleiro();
    const row = LINHA_PARA_ROW[s.linha] ?? 2;
    return { col: 2, row };
  });
  return realinharSimetriaGrade(rascunho, esquema);
}

export function moverSlotNaGrade(
  grade: CelulaGrade[],
  slot: number,
  destino: CelulaGrade,
): CelulaGrade[] {
  if (destino.gol) return grade;
  const d: CelulaGrade = {
    col: Math.max(0, Math.min(COLS_LINHA - 1, destino.col)),
    row: Math.max(0, Math.min(LINHAS_CAMPO - 1, destino.row)),
  };
  const next = grade.map((c) => ({ ...c }));
  if (next[slot]?.gol) return next;

  const ocupante = next.findIndex((c, j) => j !== slot && mesmaCelula(c, d));
  if (ocupante >= 0) {
    next[ocupante] = { ...next[slot] };
  }
  next[slot] = d;
  return next;
}

function mapColunaAntiga(col: number): number {
  const mapa = [0, 1, 1, 2, 3, 4];
  return mapa[Math.max(0, Math.min(5, col))] ?? Math.min(4, col);
}

export function normalizarGrade(
  grade: CelulaGrade[],
  esquema: EsquemaTatico,
): CelulaGrade[] {
  const bruto = grade.map((c) => ({
    col: mapColunaAntiga(c.col),
    row: Math.max(0, Math.min(LINHAS_CAMPO - 1, c.row)),
    gol: c.gol,
  }));
  return realinharSimetriaGrade(bruto, esquema);
}

export function gradesIguais(a: CelulaGrade[] | null, b: CelulaGrade[] | null): boolean {
  if (!a?.length || !b?.length) return JSON.stringify(a) === JSON.stringify(b);
  if (a.length !== b.length) return false;
  return a.every((c, i) => mesmaCelula(c, b[i]!));
}