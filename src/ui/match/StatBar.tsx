type Props = {
  label: string;
  mandante: number | string;
  visitante: number | string;
  mandanteNome: string;
  visitanteNome: string;
  max?: number;
  sufixo?: string;
};

/**
 * Dual-bar row: home (left/green) ↔ away (right/sky).
 * Uses green-* (not remapped emerald) so home stays distinct from away on the
 * Argentina celeste theme.
 */
export function StatBar({
  label,
  mandante,
  visitante,
  mandanteNome,
  visitanteNome,
  max,
  sufixo = '',
}: Props) {
  const rawM = typeof mandante === 'number' ? mandante : parseFloat(String(mandante));
  const rawV = typeof visitante === 'number' ? visitante : parseFloat(String(visitante));
  const m = Number.isFinite(rawM) ? rawM : 0;
  const v = Number.isFinite(rawV) ? rawV : 0;
  const cap = max ?? Math.max(m, v, 1);
  const pctM = Math.min(100, (m / cap) * 100);
  const pctV = Math.min(100, (v / cap) * 100);

  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-[2.5rem] tabular-nums font-semibold text-green-400" title={mandanteNome}>
          {mandante}
          {sufixo}
        </span>
        <span className="flex-1 text-center text-[11px] font-medium text-zinc-400">{label}</span>
        <span className="min-w-[2.5rem] text-right tabular-nums font-semibold text-sky-400" title={visitanteNome}>
          {visitante}
          {sufixo}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-zinc-800/90">
          <div
            className="h-full rounded-sm bg-green-500 transition-all duration-500"
            style={{ width: `${pctM}%`, marginLeft: `${100 - pctM}%` }}
          />
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-zinc-800/90">
          <div
            className="h-full rounded-sm bg-sky-500 transition-all duration-500"
            style={{ width: `${pctV}%` }}
          />
        </div>
      </div>
    </div>
  );
}

type PosseProps = {
  mandante: number;
  visitante: number;
  mandanteNome: string;
  visitanteNome: string;
};

/** Posse: caixas coloridas + barra contínua split home/away. */
export function PossessionBar({
  mandante,
  visitante,
  mandanteNome,
  visitanteNome,
}: PosseProps) {
  const m = Math.max(0, Math.min(100, mandante));
  const v = Math.max(0, Math.min(100, visitante));

  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className="min-w-[3.25rem] rounded-md bg-green-500/20 px-2.5 py-1.5 text-center text-base font-bold tabular-nums text-green-400"
          title={mandanteNome}
        >
          {m}%
        </div>
        <span className="flex-1 text-center text-[11px] font-medium text-zinc-400">Posse de bola</span>
        <div
          className="min-w-[3.25rem] rounded-md bg-sky-500/20 px-2.5 py-1.5 text-center text-base font-bold tabular-nums text-sky-400"
          title={visitanteNome}
        >
          {v}%
        </div>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${m}%` }}
        />
        <div
          className="h-full bg-sky-500 transition-all duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
