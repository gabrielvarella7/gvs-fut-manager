import type { Posicao } from '../types/schema';

export interface AtributosEscala20 {
  defesa: number;     // 1 a 20
  passe: number;      // 1 a 20
  chute: number;      // 1 a 20
  velocidade: number; // 1 a 20
}

const PESOS_POSICAO: Record<Posicao, [number, number, number, number]> = {
  GOL: [0.76, 0.14, 0.04, 0.06],
  ZAG: [0.60, 0.20, 0.05, 0.15],
  LAT: [0.35, 0.25, 0.10, 0.30],
  VOL: [0.40, 0.35, 0.10, 0.15],
  MEI: [0.10, 0.45, 0.25, 0.20],
  ATA: [0.05, 0.20, 0.45, 0.30],
};

/**
 * Converte um atributo de 1..20 para percentual 0..100 (ex.: 14.4 -> 72%)
 */
export function attr20ParaPct(valor1a20: number): number {
  const norm = valor1a20 <= 20 ? valor1a20 : valor1a20 / 5;
  return Math.max(5, Math.min(100, norm * 5));
}

/**
 * Normaliza qualquer atributo legado (1..100) ou novo (1..20) para a escala estrita 1..20
 */
export function normalizarParaEscala20(valor: number): number {
  if (valor <= 20) return Math.max(1, Math.min(20, Math.round(valor)));
  return Math.max(1, Math.min(20, Math.round(valor / 5)));
}

/**
 * Calcula o Overall (40..99) a partir dos 4 atributos na escala 1..20
 */
export function calcularOverallDeAtributos20(
  posicao: Posicao,
  attr: AtributosEscala20
): number {
  const [wd, wp, wc, wv] = PESOS_POSICAO[posicao];
  const d = normalizarParaEscala20(attr.defesa);
  const p = normalizarParaEscala20(attr.passe);
  const c = normalizarParaEscala20(attr.chute);
  const v = normalizarParaEscala20(attr.velocidade);
  const mediaPonderada20 = d * wd + p * wp + c * wc + v * wv;
  return Math.max(40, Math.min(99, Math.round(mediaPonderada20 * 5)));
}
