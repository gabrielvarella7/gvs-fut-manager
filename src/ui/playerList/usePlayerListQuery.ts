import { useMemo, useState } from 'react';
import {
  FILTERS_VAZIOS,
  aplicarPlayerListQuery,
  direcaoPadraoSort,
  toggleSortDir,
  type PlayerListAccessors,
  type PlayerListFiltersState,
  type PlayerListSortOption,
  type PlayerListSortState,
} from './playerListQuery';

export function usePlayerListQuery<T>(
  items: T[],
  acc: PlayerListAccessors<T>,
  sortOptions: PlayerListSortOption[],
  initialSort?: PlayerListSortState | null,
) {
  const [filters, setFilters] = useState<PlayerListFiltersState>(FILTERS_VAZIOS);
  const [sort, setSort] = useState<PlayerListSortState | null>(
    initialSort === undefined
      ? sortOptions[0]
        ? { id: sortOptions[0].id, dir: direcaoPadraoSort(sortOptions[0]) }
        : null
      : initialSort,
  );

  const result = useMemo(
    () => aplicarPlayerListQuery(items, acc, filters, sort, sortOptions),
    [items, acc, filters, sort, sortOptions],
  );

  const setSortKey = (id: string) => {
    const opt = sortOptions.find((o) => o.id === id);
    if (!opt) return;
    if (sort?.id === id) {
      setSort({ id, dir: toggleSortDir(sort.dir) });
      return;
    }
    setSort({ id, dir: direcaoPadraoSort(opt) });
  };

  const setSortDir = (dir: PlayerListSortState['dir']) => {
    if (!sort) return;
    setSort({ ...sort, dir });
  };

  const resetFilters = () => setFilters(FILTERS_VAZIOS);

  return {
    filters,
    setFilters,
    sort,
    setSort,
    setSortKey,
    setSortDir,
    resetFilters,
    result,
    total: items.length,
    shown: result.length,
  };
}
