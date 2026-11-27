import type { ReactNode, MouseEvent } from 'react';
import { useGameStore } from '../../store/useGameStore';

type Props = {
  jogadorId: number;
  children: ReactNode;
  className?: string;
  title?: string;
  /** Se true, impede o clique de borbulhar (ex.: dentro de outro botão). */
  stopPropagation?: boolean;
};

/** Nome de atleta clicável → abre tela de atributos/perfil. */
export function PlayerNameLink({
  jogadorId,
  children,
  className,
  title,
  stopPropagation,
}: Props) {
  const abrir = useGameStore((s) => s.abrirPerfilJogador);
  const onClick = (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    abrir(jogadorId);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? 'Ver atributos'}
      className={
        className ??
        'font-medium text-emerald-100 underline-offset-2 hover:text-emerald-50 hover:underline'
      }
    >
      {children}
    </button>
  );
}
