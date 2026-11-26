import type { PointerEvent as ReactPointerEvent } from 'react';
import { rotuloPosicao } from '../../career/perfilJogador';
import { rotuloPosicaoCampinho } from '../../data/gradeCampinho';
import type { CelulaGrade } from '../../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../../data/esquemasTaticos';
import type { EsquemaTatico, Jogador } from '../../types/schema';

type Props = {
  elenco: Jogador[];
  slotIds: number[];
  grade11: CelulaGrade[];
  esquema: EsquemaTatico;
  compact?: boolean;
  slotAtivo: number | null;
  reservaAtiva: number | null;
  onSlotClick: (slot: number) => void;
  onReservaClick: (jogadorId: number) => void;
  onArrastarJogador?: (jogadorId: number) => void;
  arrastandoJogadorId?: number | null;
  /** Slot do campo aguardando reserva (arraste saiu do gramado) */
  slotAguardandoReserva?: number | null;
  onSoltarReservaComCampo?: (jogadorIdReserva: number) => void;
};

function nomeCurto(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] ?? nome;
  return p.length > 11 ? `${p.slice(0, 10)}…` : p;
}

function MiniJogador({
  nome,
  detalhe,
  ovr,
  ativo,
  titular,
  onClick,
  onArrastar,
  onSoltar,
  arrastando,
  alvoSubstituicao,
}: {
  nome: string;
  detalhe: string;
  ovr: number;
  ativo: boolean;
  titular?: boolean;
  onClick: () => void;
  onArrastar?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onSoltar?: () => void;
  arrastando?: boolean;
  alvoSubstituicao?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onArrastar}
      onPointerUp={onSoltar}
      className={`flex w-full cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors active:cursor-grabbing ${
        alvoSubstituicao
          ? 'border-yellow-400 bg-yellow-950/50 ring-1 ring-yellow-500/60'
          : arrastando
            ? 'border-amber-500 bg-amber-950/60 opacity-90'
            : ativo
              ? 'border-emerald-500 bg-emerald-950/80'
              : titular
                ? 'border-zinc-600 bg-zinc-800/90 hover:border-zinc-500'
                : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
          titular ? 'border-emerald-500 text-emerald-200' : 'border-zinc-500 text-zinc-300'
        }`}
      >
        {ovr}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-zinc-100">{nome}</span>
        <span className="block truncate text-[10px] text-zinc-500">{detalhe}</span>
      </span>
    </button>
  );
}

export function TacticSquadPanel({
  elenco,
  slotIds,
  grade11,
  esquema,
  compact = false,
  slotAtivo,
  reservaAtiva,
  onSlotClick,
  onReservaClick,
  onArrastarJogador,
  arrastandoJogadorId = null,
  slotAguardandoReserva = null,
  onSoltarReservaComCampo,
}: Props) {
  const porId = new Map(elenco.map((j) => [j.id, j]));
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const titularesIds = new Set(slotIds);
  const reservas = elenco.filter((j) => !titularesIds.has(j.id));

  return (
    <div
      className={`flex flex-col gap-3 ${compact ? 'max-h-[min(64vh,480px)]' : ''} overflow-hidden`}
    >
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Para o campo: arraste a reserva · do campo: solte fora e toque na reserva
      </p>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="mb-1.5 text-xs font-semibold text-emerald-400">Titulares ({slotIds.length})</h3>
        <ul className={`space-y-1 ${compact ? '' : 'grid gap-1 sm:grid-cols-2'}`}>
          {slotIds.map((id, i) => {
            const j = porId.get(id);
            const cel = grade11[i];
            const sigla =
              cel != null ? rotuloPosicaoCampinho(cel) : (slots[i] ?? j?.posicao ?? '—').slice(0, 3);
            const pos = j ? rotuloPosicao(j.posicao) : '—';
            return (
              <li key={`slot-${i}`}>
                <MiniJogador
                  nome={j ? nomeCurto(j.nome) : '—'}
                  detalhe={`${sigla} · ${pos}`}
                  ovr={j?.overall ?? 0}
                  ativo={slotAtivo === i}
                  titular
                  arrastando={j != null && arrastandoJogadorId === j.id}
                  onArrastar={(e) => {
                    if (j == null) return;
                    e.preventDefault();
                    onArrastarJogador?.(j.id);
                  }}
                  onClick={() => onSlotClick(i)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-800 pt-2">
        <h3 className="mb-1.5 text-xs font-semibold text-zinc-400">
          Reservas ({reservas.length})
        </h3>
        <ul className="space-y-1">
          {reservas.length === 0 ? (
            <li className="text-xs text-zinc-500">Todos no time</li>
          ) : (
            reservas.map((j) => (
              <li key={j.id}>
                <MiniJogador
                  nome={nomeCurto(j.nome)}
                  detalhe={rotuloPosicao(j.posicao)}
                  ovr={j.overall}
                  ativo={reservaAtiva === j.id}
                  arrastando={arrastandoJogadorId === j.id}
                  alvoSubstituicao={slotAguardandoReserva != null}
                  onArrastar={(e) => {
                    e.preventDefault();
                    onArrastarJogador?.(j.id);
                  }}
                  onSoltar={() => onSoltarReservaComCampo?.(j.id)}
                  onClick={() => onReservaClick(j.id)}
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}