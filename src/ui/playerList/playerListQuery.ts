import type { Posicao } from '../../types/schema';

export const POSICOES_FILTRO: Array<Posicao | 'TODAS'> = [
  'TODAS',
  'GOL',
  'ZAG',
  'LAT',
  'VOL',
  'MEI',
  'ATA',
];

export type PlayerListFilterId = 'busca' | 'posicao' | 'ovr' | 'valor' | 'idade';

export type PlayerListDirecao = 'asc' | 'desc';

export type PlayerListFiltersState = {
  busca: string;
  posicao: Posicao | 'TODAS';
  ovrMin: string;
  ovrMax: string;
  valorMin: string;
  valorMax: string;
  idadeMin: string;
  idadeMax: string;
};

export type PlayerListSortState = {
  id: string;
  dir: PlayerListDirecao;
};

export type PlayerListAccessors<T> = {
  nome: (t: T) => string;
  posicao: (t: T) => string;
  overall: (t: T) => number;
  idade?: (t: T) => number;
  valor?: (t: T) => number;
  /** Valores extras para ordenação (ex.: potencial, energia, salario). */
  extra?: Record<string, (t: T) => string | number>;
};

export type PlayerListSortOption = {
  id: string;
  label: string;
  /** Campo padrão ou chave em accessors.extra */
  field: 'nome' | 'posicao' | 'overall' | 'idade' | 'valor' | (string & {});
  defaultDir?: PlayerListDirecao;
};

export const FILTERS_VAZIOS: PlayerListFiltersState = {
  busca: '',
  posicao: 'TODAS',
  ovrMin: '',
  ovrMax: '',
  valorMin: '',
  valorMax: '',
  idadeMin: '',
  idadeMax: '',
};

const ORDEM_POS: Record<string, number> = {
  GOL: 0,
  LAT: 1,
  ZAG: 2,
  VOL: 3,
  MEI: 4,
  ATA: 5,
};

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseFloat(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Parse valor monetário solto (aceita 1.5M, 1500000, 1.500.000). */
export function parseFiltroValor(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/r\$\s?/g, '');
  if (!t) return null;
  if (t.endsWith('m')) {
    const n = Number.parseFloat(t.slice(0, -1).replace(',', '.'));
    return Number.isFinite(n) ? n * 1_000_000 : null;
  }
  if (t.endsWith('k')) {
    const n = Number.parseFloat(t.slice(0, -1).replace(',', '.'));
    return Number.isFinite(n) ? n * 1_000 : null;
  }
  const soDigitos = t.replace(/\D/g, '');
  if (!soDigitos) return null;
  return Number.parseInt(soDigitos, 10);
}

function passaFaixa(valor: number, minRaw: string, maxRaw: string, parse = parseNum): boolean {
  const min = parse(minRaw);
  const max = parse(maxRaw);
  if (min != null && valor < min) return false;
  if (max != null && valor > max) return false;
  return true;
}

function valorCampo<T>(
  item: T,
  field: string,
  acc: PlayerListAccessors<T>,
): string | number | null {
  switch (field) {
    case 'nome':
      return acc.nome(item);
    case 'posicao':
      return ORDEM_POS[acc.posicao(item)] ?? 99;
    case 'overall':
      return acc.overall(item);
    case 'idade':
      return acc.idade?.(item) ?? null;
    case 'valor':
      return acc.valor?.(item) ?? null;
    default:
      return acc.extra?.[field]?.(item) ?? null;
  }
}

export function filtrarPlayerList<T>(
  items: T[],
  acc: PlayerListAccessors<T>,
  filters: PlayerListFiltersState,
): T[] {
  const q = filters.busca.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !acc.nome(item).toLowerCase().includes(q)) return false;
    if (filters.posicao !== 'TODAS' && acc.posicao(item) !== filters.posicao) return false;
    if (!passaFaixa(acc.overall(item), filters.ovrMin, filters.ovrMax)) return false;
    if (acc.valor) {
      if (!passaFaixa(acc.valor(item), filters.valorMin, filters.valorMax, parseFiltroValor)) {
        return false;
      }
    }
    if (acc.idade) {
      if (!passaFaixa(acc.idade(item), filters.idadeMin, filters.idadeMax)) return false;
    }
    return true;
  });
}

export function ordenarPlayerList<T>(
  items: T[],
  acc: PlayerListAccessors<T>,
  sort: PlayerListSortState | null,
  options: PlayerListSortOption[],
): T[] {
  if (!sort) return items;
  const opt = options.find((o) => o.id === sort.id);
  if (!opt) return items;
  const sinal = sort.dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = valorCampo(a, opt.field, acc);
    const vb = valorCampo(b, opt.field, acc);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    let cmp: number;
    if (typeof va === 'string' && typeof vb === 'string') {
      cmp = va.localeCompare(vb, 'pt', { sensitivity: 'base' });
    } else {
      cmp = Number(va) - Number(vb);
    }
    if (cmp !== 0) return cmp * sinal;
    return acc.nome(a).localeCompare(acc.nome(b), 'pt', { sensitivity: 'base' });
  });
}

export function aplicarPlayerListQuery<T>(
  items: T[],
  acc: PlayerListAccessors<T>,
  filters: PlayerListFiltersState,
  sort: PlayerListSortState | null,
  sortOptions: PlayerListSortOption[],
): T[] {
  const filtrados = filtrarPlayerList(items, acc, filters);
  return ordenarPlayerList(filtrados, acc, sort, sortOptions);
}

export function toggleSortDir(dir: PlayerListDirecao): PlayerListDirecao {
  return dir === 'asc' ? 'desc' : 'asc';
}

export function direcaoPadraoSort(opt: PlayerListSortOption): PlayerListDirecao {
  if (opt.defaultDir) return opt.defaultDir;
  return opt.field === 'nome' || opt.field === 'posicao' || opt.field === 'idade' ? 'asc' : 'desc';
}
