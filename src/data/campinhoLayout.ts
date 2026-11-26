import type { EsquemaTatico, Posicao } from '../types/schema';

/** Faixas horizontais do campinho (ataque ↑, goleiro ↓) — espelho do PDF. */
export type LinhaCampinho = 'GOL' | 'DEF' | 'VOL' | 'MC' | 'MO' | 'ATA';

export type SlotCampinho = { pos: Posicao; linha: LinhaCampinho };

const Y_LINHA: Record<LinhaCampinho, number> = {
  GOL: 90,
  DEF: 76,
  VOL: 63,
  MC: 50,
  MO: 37,
  ATA: 14,
};

/** 5 colunas: pontas + trio central (alinhado à gradeCampinho). */
export const COL_X = [14, 36, 50, 64, 86] as const;

const COLS_DEF_LINHA_4: readonly number[] = [0, 1, 3, 4];

function colunasUniformes(n: number, posicoes: Posicao[] = []): number[] {
  if (n <= 0) return [];
  if (n === 1) return [2];
  if (n === 5) return [0, 1, 2, 3, 4];
  if (n === 4) return [0, 1, 3, 4];
  if (n === 3) {
    if (posicoes.every((p) => p === 'ATA')) return [0, 2, 4];
    return [1, 2, 3];
  }
  if (n === 2) {
    if (posicoes.every((p) => p === 'LAT')) return [0, 4];
    return [1, 3];
  }
  return [2];
}

function escolherCols(
  linha: LinhaCampinho,
  n: number,
  possuiLat: boolean,
  apenasZag: boolean,
  posicoes: Posicao[],
): number[] {
  if (linha === 'GOL') return [2];
  if (linha === 'DEF' && n === 4 && possuiLat) return [...COLS_DEF_LINHA_4];
  if (linha === 'DEF' && n === 2 && apenasZag) return [1, 3];
  return colunasUniformes(n, posicoes);
}

/**
 * 11 slots por esquema (ordem do campinho.pdf) com linha de profundidade.
 */
export const LAYOUT_CAMPINHO: Record<EsquemaTatico, SlotCampinho[]> = {
  '2-3-5': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '4-2-4': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '4-4-2': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '4-3-3': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '4-2-3-1': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'MEI', linha: 'MO' },
    { pos: 'MEI', linha: 'MO' },
    { pos: 'MEI', linha: 'MO' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '4-5-1': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '3-6-1': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'VOL', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '3-2-5': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '5-4-1': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'VOL', linha: 'VOL' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '6-3-1': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'DEF' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '3-5-2': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'VOL', linha: 'MC' },
    { pos: 'VOL', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
  '3-4-3': [
    { pos: 'GOL', linha: 'GOL' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'ZAG', linha: 'DEF' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'MEI', linha: 'MC' },
    { pos: 'LAT', linha: 'MC' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
    { pos: 'ATA', linha: 'ATA' },
  ],
};

export function layoutCampinho(esquema: EsquemaTatico): SlotCampinho[] {
  return LAYOUT_CAMPINHO[esquema in LAYOUT_CAMPINHO ? esquema : '4-4-2'];
}

export type PontoCampo = { x: number; y: number };

/**
 * 4-4-2 de referência: quatro na defesa, volantes no meio-círculo,
 * alas um pouco à frente, dois centroavantes simétricos (como diagrama clássico).
 * Ord: GOL · LAT ZAG ZAG LAT · MEI(VOL VOL)MEI · ATA ATA
 */
/**
 * 4-3-3 de referência: triângulo no meio (8–5–10), pontas altas e 9 central.
 * Ord: GOL · LAT ZAG ZAG LAT · MEI VOL MEI · ATA(ponta) ATA(nove) ATA(ponta)
 */
const COORDS_4_3_3: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 10, y: 74 },
  { x: 33, y: 76 },
  { x: 67, y: 76 },
  { x: 90, y: 74 },
  { x: 27, y: 47 },
  { x: 50, y: 57 },
  { x: 73, y: 47 },
  { x: 12, y: 17 },
  { x: 50, y: 12 },
  { x: 88, y: 17 },
];

/**
 * 3-4-3 de referência: zaga em arco, dupla central, alas na divisão,
 * trio de ataque com 9 adiantado e apoio nas meias-espaças.
 * Ord: GOL · ZAG ZAG ZAG · LAT MEI MEI LAT · ATA ATA ATA
 */
const COORDS_3_4_3: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 26, y: 75 },
  { x: 50, y: 70 },
  { x: 74, y: 75 },
  { x: 10, y: 50 },
  { x: 41, y: 54 },
  { x: 59, y: 54 },
  { x: 90, y: 50 },
  { x: 32, y: 22 },
  { x: 50, y: 13 },
  { x: 68, y: 22 },
];

/**
 * 4-2-3-1 de referência: dois volantes recuados, trio com 10/11/7 e ponta única.
 * Ord: GOL · LAT ZAG ZAG LAT · VOL VOL · MEI MEI MEI · ATA
 */
/** tactical-board.com 4-2-3-1: linhas horizontais 4 · 2 · 3 · 1 */
const COORDS_4_2_3_1: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 10, y: 74 },
  { x: 33, y: 76 },
  { x: 67, y: 76 },
  { x: 90, y: 74 },
  { x: 36, y: 60 },
  { x: 64, y: 60 },
  { x: 14, y: 28 },
  { x: 50, y: 28 },
  { x: 86, y: 28 },
  { x: 50, y: 12 },
];

/**
 * 4-2-4 de referência: dupla no meio-círculo, quatro atacantes na linha alta.
 * Ord: GOL · LAT ZAG ZAG LAT · MEI MEI · ATA ATA ATA ATA
 */
const COORDS_4_2_4: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 10, y: 74 },
  { x: 33, y: 76 },
  { x: 67, y: 76 },
  { x: 90, y: 74 },
  { x: 38, y: 50 },
  { x: 62, y: 50 },
  { x: 12, y: 16 },
  { x: 40, y: 15 },
  { x: 60, y: 15 },
  { x: 88, y: 16 },
];

/**
 * 4-5-1 de referência: dupla volante recuada, alas no círculo, 10 central, 9 isolado.
 * Ord: GOL · LAT ZAG ZAG LAT · VOL VOL · MEI MEI MEI · ATA
 */
const COORDS_4_5_1: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 10, y: 74 },
  { x: 33, y: 76 },
  { x: 67, y: 76 },
  { x: 90, y: 74 },
  { x: 36, y: 58 },
  { x: 64, y: 58 },
  { x: 12, y: 47 },
  { x: 50, y: 45 },
  { x: 88, y: 47 },
  { x: 50, y: 14 },
];

const COORDS_4_4_2: PontoCampo[] = [
  { x: 50, y: 91 },
  { x: 10, y: 74 },
  { x: 33, y: 76 },
  { x: 67, y: 76 },
  { x: 90, y: 74 },
  { x: 14, y: 41 },
  { x: 36, y: 51 },
  { x: 64, y: 51 },
  { x: 86, y: 41 },
  { x: 40, y: 15 },
  { x: 60, y: 15 },
];

const COORDS_REFERENCIA: Partial<Record<EsquemaTatico, PontoCampo[]>> = {
  '3-4-3': COORDS_3_4_3,
  '4-2-3-1': COORDS_4_2_3_1,
  '4-2-4': COORDS_4_2_4,
  '4-3-3': COORDS_4_3_3,
  '4-4-2': COORDS_4_4_2,
  '4-5-1': COORDS_4_5_1,
};

export function coordsReferenciaCampinho(esquema: EsquemaTatico): PontoCampo[] | null {
  const ref = COORDS_REFERENCIA[esquema];
  return ref ? ref.map((p) => ({ ...p })) : null;
}

/** Campinho inclinado (tactical-board) em todas as táticas. */
export function campinhoUsaPerspectiva(_esquema?: EsquemaTatico): boolean {
  return true;
}

export const CAMPO_PERSPECTIVA = {
  perspectivePx: 920,
  rotateX: 18,
  scale: 0.93,
  originY: '42%',
} as const;

export function coordsCampinho(esquema: EsquemaTatico): PontoCampo[] {
  const key = esquema in LAYOUT_CAMPINHO ? esquema : '4-4-2';
  const ref = COORDS_REFERENCIA[key];
  if (ref) return ref.map((p) => ({ ...p }));

  const slots = layoutCampinho(esquema);
  const porLinha = new Map<LinhaCampinho, SlotCampinho[]>();

  for (const s of slots) {
    const lista = porLinha.get(s.linha) ?? [];
    lista.push(s);
    porLinha.set(s.linha, lista);
  }

  const colunasPorLinha = new Map<LinhaCampinho, number[]>();
  for (const [linha, lista] of porLinha) {
    const possuiLat = lista.some((s) => s.pos === 'LAT');
    const apenasZag = lista.every((s) => s.pos === 'ZAG' || s.pos === 'GOL');
    colunasPorLinha.set(
      linha,
      escolherCols(
        linha,
        lista.length,
        possuiLat,
        apenasZag,
        lista.map((s) => s.pos),
      ),
    );
  }

  const usoCol = new Map<LinhaCampinho, number>();
  const coords: PontoCampo[] = [];

  for (const s of slots) {
    const linha = s.linha;
    const y = Y_LINHA[linha];
    const cols = colunasPorLinha.get(linha)!;
    const idx = usoCol.get(linha) ?? 0;
    usoCol.set(linha, idx + 1);
    const col = cols[idx] ?? 2;
    const x = linha === 'GOL' ? 50 : COL_X[col];
    coords.push({ x, y });
  }

  return coords;
}