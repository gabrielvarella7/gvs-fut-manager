import type { ReactNode } from 'react';
import type { PlayerListDirecao } from './playerListQuery';

type Props = {
  sortId: string;
  ativa: boolean;
  direcao: PlayerListDirecao;
  onSort: (id: string) => void;
  className?: string;
  children: ReactNode;
  title?: string;
};

export function SortableTh({
  sortId,
  ativa,
  direcao,
  onSort,
  className,
  children,
  title,
}: Props) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortId)}
        className={`inline-flex items-center gap-0.5 font-semibold tracking-wide transition-colors hover:text-zinc-100 ${
          ativa ? 'text-emerald-300' : 'text-zinc-400'
        }`}
        aria-sort={ativa ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
        title={title ?? `Ordenar por ${typeof children === 'string' ? children : sortId}`}
      >
        {children}
        <span className="text-[10px] opacity-80" aria-hidden>
          {ativa ? (direcao === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );
}
