import type { ReactNode, MouseEvent } from 'react';
import { useGameStore } from '../../store/useGameStore';

type Props = {
  clubeId: string;
  children: ReactNode;
  className?: string;
  title?: string;
  stopPropagation?: boolean;
};

/** Nome de clube clicável → abre o elenco daquele clube. */
export function ClubNameLink({
  clubeId,
  children,
  className,
  title,
  stopPropagation,
}: Props) {
  const abrir = useGameStore((s) => s.abrirElencoClube);
  const onClick = (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    abrir(clubeId);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? 'Ver elenco do clube'}
      className={
        className ??
        'font-medium text-sky-200 underline-offset-2 hover:text-sky-100 hover:underline'
      }
    >
      {children}
    </button>
  );
}
