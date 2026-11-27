import type { Posicao } from '../../types/schema';
import {
  POSICOES_FILTRO,
  type PlayerListFilterId,
  type PlayerListFiltersState,
  type PlayerListSortOption,
  type PlayerListSortState,
} from './playerListQuery';

type Props = {
  filters: PlayerListFiltersState;
  onFiltersChange: (next: PlayerListFiltersState) => void;
  enabledFilters: PlayerListFilterId[];
  sortOptions?: PlayerListSortOption[];
  sort?: PlayerListSortState | null;
  onSortKeyChange?: (id: string) => void;
  onSortDirChange?: (dir: PlayerListSortState['dir']) => void;
  /** Quando true, esconde o seletor de ordenação (ex.: tabela com headers clicáveis). */
  hideSortControls?: boolean;
  shown?: number;
  total?: number;
  className?: string;
};

const inputCls =
  'rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600';

export function PlayerListToolbar({
  filters,
  onFiltersChange,
  enabledFilters,
  sortOptions = [],
  sort = null,
  onSortKeyChange,
  onSortDirChange,
  hideSortControls = false,
  shown,
  total,
  className = '',
}: Props) {
  const patch = (partial: Partial<PlayerListFiltersState>) =>
    onFiltersChange({ ...filters, ...partial });

  const show = (id: PlayerListFilterId) => enabledFilters.includes(id);
  const temFiltroAtivo =
    filters.busca.trim() !== '' ||
    filters.posicao !== 'TODAS' ||
    filters.ovrMin !== '' ||
    filters.ovrMax !== '' ||
    filters.valorMin !== '' ||
    filters.valorMax !== '' ||
    filters.idadeMin !== '' ||
    filters.idadeMax !== '';

  return (
    <div className={`mb-3 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-end gap-2">
        {show('busca') && (
          <label className="min-w-[160px] flex-1 text-[10px] uppercase tracking-wide text-zinc-500">
            Buscar
            <input
              type="search"
              placeholder="Nome…"
              value={filters.busca}
              onChange={(e) => patch({ busca: e.target.value })}
              className={`mt-1 block w-full ${inputCls}`}
            />
          </label>
        )}
        {show('posicao') && (
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            Posição
            <select
              value={filters.posicao}
              onChange={(e) => patch({ posicao: e.target.value as Posicao | 'TODAS' })}
              className={`mt-1 block ${inputCls}`}
            >
              {POSICOES_FILTRO.map((p) => (
                <option key={p} value={p}>
                  {p === 'TODAS' ? 'Todas' : p}
                </option>
              ))}
            </select>
          </label>
        )}
        {show('ovr') && (
          <fieldset className="flex items-end gap-1">
            <legend className="sr-only">OVR</legend>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              OVR min
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                placeholder="—"
                value={filters.ovrMin}
                onChange={(e) => patch({ ovrMin: e.target.value })}
                className={`mt-1 block w-16 ${inputCls}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              max
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                placeholder="—"
                value={filters.ovrMax}
                onChange={(e) => patch({ ovrMax: e.target.value })}
                className={`mt-1 block w-16 ${inputCls}`}
              />
            </label>
          </fieldset>
        )}
        {show('valor') && (
          <fieldset className="flex items-end gap-1">
            <legend className="sr-only">Valor</legend>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Valor min
              <input
                type="text"
                inputMode="numeric"
                placeholder="ex. 2M"
                value={filters.valorMin}
                onChange={(e) => patch({ valorMin: e.target.value })}
                className={`mt-1 block w-24 ${inputCls}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              max
              <input
                type="text"
                inputMode="numeric"
                placeholder="ex. 10M"
                value={filters.valorMax}
                onChange={(e) => patch({ valorMax: e.target.value })}
                className={`mt-1 block w-24 ${inputCls}`}
              />
            </label>
          </fieldset>
        )}
        {show('idade') && (
          <fieldset className="flex items-end gap-1">
            <legend className="sr-only">Idade</legend>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Idade min
              <input
                type="number"
                inputMode="numeric"
                min={15}
                max={45}
                placeholder="—"
                value={filters.idadeMin}
                onChange={(e) => patch({ idadeMin: e.target.value })}
                className={`mt-1 block w-16 ${inputCls}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              max
              <input
                type="number"
                inputMode="numeric"
                min={15}
                max={45}
                placeholder="—"
                value={filters.idadeMax}
                onChange={(e) => patch({ idadeMax: e.target.value })}
                className={`mt-1 block w-16 ${inputCls}`}
              />
            </label>
          </fieldset>
        )}
        {!hideSortControls && sortOptions.length > 0 && (
          <>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Ordenar
              <select
                value={sort?.id ?? ''}
                onChange={(e) => onSortKeyChange?.(e.target.value)}
                className={`mt-1 block ${inputCls}`}
              >
                {sortOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Dir
              <select
                value={sort?.dir ?? 'asc'}
                onChange={(e) =>
                  onSortDirChange?.(e.target.value as PlayerListSortState['dir'])
                }
                className={`mt-1 block ${inputCls}`}
              >
                <option value="asc">Asc ↑</option>
                <option value="desc">Desc ↓</option>
              </select>
            </label>
          </>
        )}
        {temFiltroAtivo && (
          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                busca: '',
                posicao: 'TODAS',
                ovrMin: '',
                ovrMax: '',
                valorMin: '',
                valorMax: '',
                idadeMin: '',
                idadeMax: '',
              })
            }
            className="rounded px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Limpar
          </button>
        )}
      </div>
      {shown != null && total != null && (
        <p className="text-[11px] text-zinc-500">
          {shown === total ? `${total} atletas` : `${shown} de ${total} atletas`}
        </p>
      )}
    </div>
  );
}
