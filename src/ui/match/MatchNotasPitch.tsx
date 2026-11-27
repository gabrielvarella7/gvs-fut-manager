import { useMemo } from 'react';
import {
  calcularNotasPitchLive,
  corNotaRating,
  formatarNota,
  type TimeNotasInput,
} from '../../engine/matchNotas';
import type { MatchSimResult } from '../../engine/matchEngine';

type Props = {
  result: MatchSimResult;
  minuto: number;
  mandante: TimeNotasInput;
  visitante: TimeNotasInput;
};

function KitSwatch({ primaria, secundaria }: { primaria: string; secundaria: string }) {
  return (
    <span
      className="inline-block h-5 w-4 shrink-0 rounded-sm border border-zinc-600 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${primaria} 48%, ${secundaria} 52%)`,
      }}
      aria-hidden
    />
  );
}

function MediaBadge({ media }: { media: number }) {
  return (
    <span
      className="inline-flex min-w-[2.4rem] items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-zinc-950"
      style={{ backgroundColor: corNotaRating(media) }}
    >
      {formatarNota(media)}
    </span>
  );
}

function PlayerNode({
  numero,
  nomeCurto,
  nota,
  capitao,
  entrouComoSub,
  gols,
  assistencias,
  motm,
  kitPrimaria,
}: {
  numero: number;
  nomeCurto: string;
  nota: number;
  capitao: boolean;
  entrouComoSub: boolean;
  gols: number;
  assistencias: number;
  motm: boolean;
  kitPrimaria: string;
}) {
  const badge = corNotaRating(nota);
  return (
    <div className="pointer-events-none flex w-[3.6rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <div className="relative">
        {entrouComoSub && (
          <span
            className="absolute -left-1 -top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-900 text-[8px] ring-1 ring-zinc-600"
            title="Entrou"
          >
            <span className="leading-none text-emerald-400">↗</span>
            <span className="leading-none text-red-400">↙</span>
          </span>
        )}
        {(gols > 0 || assistencias > 0) && (
          <span className="absolute -right-2 -top-1 z-10 flex items-center gap-0.5 rounded bg-zinc-950/85 px-0.5 py-px text-[8px] font-semibold text-zinc-100 ring-1 ring-zinc-700">
            {gols > 0 && (
              <span title="Gol(s)" className="inline-flex items-center gap-0.5">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full bg-zinc-100"
                />
                {gols > 1 ? gols : ''}
              </span>
            )}
            {assistencias > 0 && (
              <span
                title="Assistência(s)"
                className="inline-flex items-center gap-0.5 text-sky-300"
              >
                <span
                  aria-hidden
                  className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-sm bg-sky-500/90 text-[6px] font-bold leading-none text-zinc-950"
                >
                  A
                </span>
                {assistencias > 1 ? assistencias : ''}
              </span>
            )}
          </span>
        )}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-bold text-white shadow-md"
          style={{
            backgroundColor: kitPrimaria,
            borderColor: 'rgba(255,255,255,0.35)',
            textShadow: '0 1px 2px rgba(0,0,0,0.65)',
          }}
        >
          {numero}
        </div>
        <span
          className="absolute -bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5"
        >
          <span
            className="rounded px-1 py-[1px] text-[9px] font-bold tabular-nums text-zinc-950 shadow"
            style={{ backgroundColor: badge }}
          >
            {formatarNota(nota)}
          </span>
          {motm && (
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] text-white shadow"
              title="Craque da partida"
            >
              ★
            </span>
          )}
        </span>
      </div>
      <span className="mt-2 max-w-[3.6rem] truncate text-center text-[8px] font-medium leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {capitao ? `${numero} (c) ${nomeCurto}` : `${numero} ${nomeCurto}`}
      </span>
    </div>
  );
}

function PitchMarkings() {
  return (
    <>
      <div className="pointer-events-none absolute inset-[2.5%] rounded-[2px] border border-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-[2.5%] bottom-[2.5%] w-px -translate-x-1/2 bg-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      {/* Área esquerda */}
      <div className="pointer-events-none absolute left-[2.5%] top-1/2 h-[56%] w-[14%] -translate-y-1/2 border border-l-0 border-white/28" />
      <div className="pointer-events-none absolute left-[2.5%] top-1/2 h-[28%] w-[6%] -translate-y-1/2 border border-l-0 border-white/28" />
      {/* Área direita */}
      <div className="pointer-events-none absolute right-[2.5%] top-1/2 h-[56%] w-[14%] -translate-y-1/2 border border-r-0 border-white/28" />
      <div className="pointer-events-none absolute right-[2.5%] top-1/2 h-[28%] w-[6%] -translate-y-1/2 border border-r-0 border-white/28" />
    </>
  );
}

export function MatchNotasPitch({ result, minuto, mandante, visitante }: Props) {
  const live = useMemo(
    () =>
      calcularNotasPitchLive({
        result,
        minuto,
        mandante,
        visitante,
      }),
    [result, minuto, mandante, visitante],
  );

  const { mandante: m, visitante: v } = live;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <KitSwatch primaria={m.corPrimaria} secundaria={m.corSecundaria} />
          <span className="truncate text-sm font-semibold text-zinc-100">{m.nome}</span>
          <MediaBadge media={m.media} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-medium tabular-nums text-zinc-300">{m.esquema}</span>
          <KitSwatch primaria={m.corPrimaria} secundaria={m.corSecundaria} />
          <KitSwatch primaria={v.corPrimaria} secundaria={v.corSecundaria} />
          <span className="font-medium tabular-nums text-zinc-300">{v.esquema}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <MediaBadge media={v.media} />
          <span className="truncate text-sm font-semibold text-zinc-100">{v.nome}</span>
          <KitSwatch primaria={v.corPrimaria} secundaria={v.corSecundaria} />
        </div>
      </header>

      <div
        className="relative mx-auto aspect-[105/68] w-full max-h-[min(62vh,420px)] min-h-[220px] bg-[repeating-linear-gradient(90deg,#14532d_0px,#14532d_28px,#166534_28px,#166534_56px)]"
        role="img"
        aria-label={`Notas ao vivo: ${m.nome} ${formatarNota(m.media)} × ${v.nome} ${formatarNota(v.media)}`}
      >
        <PitchMarkings />
        {[...m.jogadores, ...v.jogadores].map((j) => (
          <div
            key={j.jogadorId}
            className="absolute"
            style={{ left: `${j.x}%`, top: `${j.y}%` }}
          >
            <PlayerNode
              numero={j.numero}
              nomeCurto={j.nomeCurto}
              nota={j.nota}
              capitao={j.capitao}
              entrouComoSub={j.entrouComoSub}
              gols={j.gols}
              assistencias={j.assistencias}
              motm={j.motm}
              kitPrimaria={
                m.jogadores.some((p) => p.jogadorId === j.jogadorId)
                  ? m.corPrimaria
                  : v.corPrimaria
              }
            />
          </div>
        ))}
      </div>

      <p className="border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-500">
        Notas ao vivo · atualizam com o minuto da transmissão · sem fotos
      </p>
    </div>
  );
}
