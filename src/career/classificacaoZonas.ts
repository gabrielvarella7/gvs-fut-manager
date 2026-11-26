import type { CampeonatoConfig } from '../types/schema';

export type RotuloZona =
  | 'libertadores'
  | 'pre_libertadores'
  | 'sul_americana'
  | 'meio'
  | 'rebaixamento';

export function zonaNaPosicao(pos: number, campeonato?: CampeonatoConfig | null): RotuloZona {
  const z = campeonato?.zonas;
  if (!z) {
    if (pos <= 4) return 'libertadores';
    if (pos === 5) return 'pre_libertadores';
    if (pos <= 11) return 'sul_americana';
    if (pos >= 17) return 'rebaixamento';
    return 'meio';
  }
  if (z.libertadores.includes(pos)) return 'libertadores';
  if (z.pre_libertadores.includes(pos)) return 'pre_libertadores';
  if (z.sul_americana.includes(pos)) return 'sul_americana';
  if (z.rebaixamento.includes(pos)) return 'rebaixamento';
  return 'meio';
}

export function classesZonaTabela(zona: RotuloZona): { linha: string; posicao: string } {
  switch (zona) {
    case 'libertadores':
      return {
        linha: 'bg-sky-950/35 border-sky-900/40',
        posicao: 'text-sky-300 font-bold',
      };
    case 'pre_libertadores':
      return {
        linha: 'bg-emerald-950/35 border-emerald-900/40',
        posicao: 'text-emerald-300 font-bold',
      };
    case 'sul_americana':
      return {
        linha: 'bg-amber-950/30 border-amber-900/30',
        posicao: 'text-amber-300 font-semibold',
      };
    case 'rebaixamento':
      return {
        linha: 'bg-rose-950/40 border-rose-900/40',
        posicao: 'text-rose-300 font-bold',
      };
    default:
      return { linha: '', posicao: 'text-zinc-400' };
  }
}

export const LEGENDA_ZONAS = [
  { cor: 'bg-sky-500', texto: '1º–4º · Libertadores' },
  { cor: 'bg-emerald-500', texto: '5º · Pré-Libertadores' },
  { cor: 'bg-amber-500', texto: '6º–11º · Sul-Americana' },
  { cor: 'bg-rose-500', texto: '17º–20º · Série B' },
] as const;