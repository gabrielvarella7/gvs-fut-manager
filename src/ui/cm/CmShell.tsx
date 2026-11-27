import type { ReactNode } from 'react';

type Props = {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
};

export function CmShell({ titulo, subtitulo, children, rodape }: Props) {
  return (
    <div className="cm-app mx-auto flex min-h-screen max-w-4xl flex-col font-sans text-zinc-100">
      <header className="cm-header border-b border-emerald-900 px-4 py-3">
        <p className="cm-brand text-xs uppercase tracking-widest text-emerald-400">Mestre Mou</p>
        <h1 className="text-xl font-semibold text-emerald-50">{titulo}</h1>
        {subtitulo && <p className="text-sm text-zinc-400">{subtitulo}</p>}
      </header>
      <main className="cm-body flex-1 px-4 py-4">{children}</main>
      {rodape && (
        <footer className="cm-footer sticky bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
          {rodape}
        </footer>
      )}
    </div>
  );
}

export function CmPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <RoutingPanel className={className}>
      {children}
    </RoutingPanel>
  );
}

function RoutingPanel({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`rounded border border-zinc-700 bg-zinc-900/90 p-4 ${className}`}>{children}</div>
  );
}

export function CmBtn({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
      : variant === 'danger'
        ? 'bg-red-900/80 hover:bg-red-800 text-red-100'
        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

export function CmMenuList({
  items,
}: {
  items: { label: string; hint?: string; onClick: () => void; disabled?: boolean }[];
}) {
  return (
    <ul className="divide-y divide-zinc-800 rounded border border-zinc-700">
      {items.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-emerald-950/50 disabled:opacity-40"
          >
            <span className="font-medium text-emerald-50">{item.label}</span>
            {item.hint && <span className="text-xs text-zinc-500">{item.hint}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}