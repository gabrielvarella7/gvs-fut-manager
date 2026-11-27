import { momentoAteMinuto } from '../../engine/matchMomentum';
import type { MomentoAtaque } from '../../engine/matchStats';

type Props = {
  momento: MomentoAtaque[];
  minutoAtual: number;
  mandanteNome: string;
  visitanteNome: string;
  /** Fill full 0–90 axis even before kickoff minutes exist (live clock). */
  minutosTotais?: number;
};

const BAR_MAX = 100;
const HALF_H = 52;

/**
 * SofaScore-style attack momentum — dark Mestre Mou bars.
 * Y: −100 (away) … +100 (home). Updates with the live match clock.
 */
export function MatchMomentum({
  momento,
  minutoAtual,
  mandanteNome,
  visitanteNome,
  minutosTotais = 90,
}: Props) {
  const visivel = momentoAteMinuto(momento, minutoAtual);
  const byMin = new Map(visivel.map((m) => [m.minuto, m]));
  const eixo = Math.max(minutosTotais, minutoAtual, 1);
  const ticks = [0, 15, 30, 45, 60, 75, 90].filter((t) => t <= eixo);

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--mm-border)',
        background:
          'linear-gradient(180deg, rgba(6,22,40,0.95) 0%, rgba(10,39,72,0.92) 100%)',
      }}
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--mm-texto)' }}>
            Momentum de ataque
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--mm-muted)' }}>
            ↑ {mandanteNome} · ↓ {visitanteNome}
          </p>
        </div>
        <p className="tabular-nums text-[11px]" style={{ color: 'var(--mm-celeste)' }}>
          {minutoAtual > 0 ? `${minutoAtual}'` : '0\''}
        </p>
      </div>

      <div className="relative" style={{ height: HALF_H * 2 + 8 }}>
        {/* Midline */}
        <div
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{ top: HALF_H + 3, height: 1, background: 'rgba(155,184,212,0.35)' }}
        />
        {/* Soft band guides */}
        <div
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{
            top: HALF_H + 3 - HALF_H * 0.4,
            height: 1,
            background: 'rgba(116,172,223,0.12)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{
            top: HALF_H + 3 + HALF_H * 0.4,
            height: 1,
            background: 'rgba(116,172,223,0.12)',
          }}
        />

        <div className="relative z-10 flex h-full items-stretch gap-px px-0.5">
          {Array.from({ length: eixo }, (_, i) => {
            const minuto = i + 1;
            const m: MomentoAtaque | undefined = byMin.get(minuto);
            const valor = m?.valor ?? 0;
            const played = minuto <= minutoAtual;
            const h = played ? (Math.abs(valor) / BAR_MAX) * HALF_H : 0;
            const home = valor >= 0;
            const isNow = played && minuto === minutoAtual;

            return (
              <div
                key={minuto}
                className="relative flex min-w-0 flex-1 flex-col"
                title={
                  m
                    ? `${minuto}' · ${valor >= 0 ? '+' : ''}${valor.toFixed(0)}`
                    : `${minuto}'`
                }
              >
                <div className="flex flex-1 flex-col justify-end">
                  {played && home && h > 0 ? (
                    <div
                      className="mx-auto w-full max-w-[6px] rounded-t-sm"
                      style={{
                        height: Math.max(h, 1),
                        background: isNow
                          ? 'var(--mm-celeste)'
                          : 'linear-gradient(180deg, #8cc4ea 0%, #3d7eb8 100%)',
                        boxShadow: m?.golMandante
                          ? '0 0 6px rgba(116,172,223,0.85)'
                          : undefined,
                        opacity: m?.chanceMandante && !m.golMandante ? 0.85 : 1,
                      }}
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-start">
                  {played && !home && h > 0 ? (
                    <div
                      className="mx-auto w-full max-w-[6px] rounded-b-sm"
                      style={{
                        height: Math.max(h, 1),
                        background: isNow
                          ? '#f0b429'
                          : 'linear-gradient(180deg, #c4a035 0%, #8a6a18 100%)',
                        boxShadow: m?.golVisitante
                          ? '0 0 6px rgba(240,180,41,0.75)'
                          : undefined,
                        opacity: m?.chanceVisitante && !m.golVisitante ? 0.85 : 1,
                      }}
                    />
                  ) : null}
                </div>
                {m?.golMandante ? (
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 text-[7px] leading-none"
                    style={{ color: 'var(--mm-celeste)' }}
                  >
                    ●
                  </span>
                ) : null}
                {m?.golVisitante ? (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[7px] leading-none"
                    style={{ color: '#f0b429' }}
                  >
                    ●
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Live clock cursor */}
        {minutoAtual > 0 && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px"
            style={{
              left: `${((Math.min(minutoAtual, eixo) - 0.5) / eixo) * 100}%`,
              background: 'rgba(248,113,113,0.85)',
            }}
          />
        )}
      </div>

      <div
        className="mt-1 flex justify-between text-[10px] tabular-nums"
        style={{ color: 'var(--mm-muted)' }}
      >
        {ticks.map((t) => (
          <span key={t}>{t}&apos;</span>
        ))}
      </div>
    </div>
  );
}
