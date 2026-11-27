type Props = {
  label: string;
  mandante: number | string;
  visitante: number | string;
  mandanteNome: string;
  visitanteNome: string;
  max?: number;
  sufixo?: string;
};

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
    <div className="py-2">
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span title={mandanteNome}>
          {mandante}
          {sufixo}
        </span>
        <span className="text-zinc-400">{label}</span>
        <span title={visitanteNome}>
          {visitante}
          {sufixo}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-zinc-800">
          <div
            className="h-full rounded bg-emerald-500 transition-all duration-500"
            style={{ width: `${pctM}%`, marginLeft: `${100 - pctM}%` }}
          />
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-zinc-800">
          <div
            className="h-full rounded bg-sky-500 transition-all duration-500"
            style={{ width: `${pctV}%` }}
          />
        </div>
      </div>
    </div>
  );
}