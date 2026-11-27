import { momentoAteMinuto } from '../../engine/matchMomentum';
import type { MomentoAtaque } from '../../engine/matchStats';

type Props = {
  momento: MomentoAtaque[];
  minutoAtual: number;
  mandanteNome: string;
  visitanteNome: string;
};

/**
 * Placeholder chart — final Sofascore-style attack/defense oscillation UI
 * is paused until Gabriel’s reference lands. Data already updates live via
 * `momentoAteMinuto` + continuous engine series.
 */
export function MatchMomentum({ momento, minutoAtual, mandanteNome, visitanteNome }: Props) {
  const visivel = momentoAteMinuto(momento, minutoAtual);
  const max = Math.max(...visivel.map((m) => Math.abs(m.valor)), 1);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold text-zinc-200">Fluxo da partida</h3>
      <p className="mb-3 text-xs text-zinc-500">
        ↑ {mandanteNome} · ↓ {visitanteNome}
      </p>
      <div className="relative flex h-24 items-center gap-px overflow-hidden rounded bg-zinc-800/80 px-1">
        {visivel.map((m) => {
          const h = (Math.abs(m.valor) / max) * 42;
          const cima = m.valor >= 0;
          return (
            <div key={m.minuto} className="relative flex h-full min-w-0 flex-1 flex-col justify-center">
              {cima ? (
                <div
                  className="mx-auto w-full max-w-[8px] rounded-t bg-emerald-500/90"
                  style={{ height: h }}
                  title={`${m.minuto}'`}
                />
              ) : null}
              <div className="h-px w-full bg-zinc-600" />
              {!cima ? (
                <div
                  className="mx-auto w-full max-w-[8px] rounded-b bg-sky-500/90"
                  style={{ height: h }}
                  title={`${m.minuto}'`}
                />
              ) : null}
              {m.golMandante && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] text-emerald-300">
                  ⚽
                </span>
              )}
              {m.golVisitante && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-sky-300">
                  ⚽
                </span>
              )}
            </div>
          );
        })}
        <div
          className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-red-500"
          style={{ left: `${(minutoAtual / 90) * 100}%` }}
        />
      </div>
    </div>
  );
}