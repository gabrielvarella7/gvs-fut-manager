import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  bloqueadoPorLesaoComEnergiaBaixa,
  rotuloBloqueioLesaoEnergia,
} from '../../career/aptidaoEscalacao';
import { corClasseEnergia, rotuloEnergiaCurto } from '../../career/energia';
import { RESERVAS_PARTIDA } from '../../career/lineup';
import { rotuloPosicao } from '../../career/perfilJogador';
import { rotuloPosicaoCampinho } from '../../data/gradeCampinho';
import type { CelulaGrade } from '../../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../../data/esquemasTaticos';
import type { EsquemaTatico, Jogador, Posicao } from '../../types/schema';
import {
  FILTERS_VAZIOS,
  POSICOES_FILTRO,
  aplicarPlayerListQuery,
  jogadorAccessors,
  SORT_MERCADO,
} from '../playerList';

/** Movimento mínimo (px) para tratar o gesto como arraste e não como clique. */
const LIMIAR_ARRASTO_PX = 8;

type Props = {
  elenco: Jogador[];
  slotIds: number[];
  /** Até 11 reservas relacionadas para a partida. */
  bancoIds: number[];
  grade11: CelulaGrade[];
  esquema: EsquemaTatico;
  compact?: boolean;
  slotAtivo: number | null;
  reservaAtiva: number | null;
  onSlotClick: (slot: number) => void;
  onReservaClick: (jogadorId: number) => void;
  /** Alterna jogador entre banco relacionado e fora da lista. */
  onToggleBanco: (jogadorId: number) => void;
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
  energia,
  ativo,
  titular,
  onClick,
  onArrastar,
  onSoltar,
  arrastando,
  alvoSubstituicao,
  bloqueado,
  titleBloqueio,
}: {
  nome: string;
  detalhe: string;
  ovr: number;
  energia?: number;
  ativo: boolean;
  titular?: boolean;
  onClick: () => void;
  onArrastar?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onSoltar?: () => void;
  arrastando?: boolean;
  alvoSubstituicao?: boolean;
  bloqueado?: boolean;
  titleBloqueio?: string | null;
}) {
  const energiaBaixa = energia != null && energia < 70;
  /**
   * Com setPointerCapture o `click` dispara mesmo após arrastar até o gramado.
   * Se o gesto moveu, ignoramos o click para não chamar toggleBanco e desfazer
   * a substituição elenco → campo persistida no pointerup do TacticPitch.
   */
  const gestoRef = useRef<{ x: number; y: number; moveu: boolean } | null>(null);
  return (
    <button
      type="button"
      disabled={bloqueado && !titular}
      title={titleBloqueio ?? undefined}
      onClick={() => {
        const foiArrasto = gestoRef.current?.moveu === true;
        gestoRef.current = null;
        if (foiArrasto) return;
        if (bloqueado && !titular) return;
        onClick();
      }}
      onPointerDown={(e) => {
        if (bloqueado) return;
        gestoRef.current = { x: e.clientX, y: e.clientY, moveu: false };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        onArrastar?.(e);
      }}
      onPointerMove={(e) => {
        const g = gestoRef.current;
        if (!g || g.moveu) return;
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) >= LIMIAR_ARRASTO_PX) {
          g.moveu = true;
        }
      }}
      onPointerUp={onSoltar}
      onPointerCancel={() => {
        gestoRef.current = null;
      }}
      style={{ touchAction: 'none' }}
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
        bloqueado
          ? 'cursor-not-allowed border-rose-800/80 bg-rose-950/40 opacity-70'
          : 'cursor-grab active:cursor-grabbing'
      } ${
        bloqueado
          ? ''
          : alvoSubstituicao
            ? 'border-yellow-400 bg-yellow-950/50 ring-1 ring-yellow-500/60'
            : arrastando
              ? 'border-amber-500 bg-amber-950/60 opacity-90'
              : ativo
                ? 'border-emerald-500 bg-emerald-950/80'
                : energiaBaixa
                  ? 'border-amber-800/80 bg-zinc-900/70 hover:border-amber-600'
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
      {energia != null && (
        <span
          className={`shrink-0 text-[10px] font-semibold tabular-nums ${corClasseEnergia(energia)}`}
          title="Energia"
        >
          {rotuloEnergiaCurto(energia)}
        </span>
      )}
    </button>
  );
}

export function TacticSquadPanel({
  elenco,
  slotIds,
  bancoIds,
  grade11,
  esquema,
  compact = false,
  slotAtivo,
  reservaAtiva,
  onSlotClick,
  onReservaClick,
  onToggleBanco,
  onArrastarJogador,
  arrastandoJogadorId = null,
  slotAguardandoReserva = null,
  onSoltarReservaComCampo,
}: Props) {
  const porId = new Map(elenco.map((j) => [j.id, j]));
  const slots = SLOTS_POR_ESQUEMA[esquemaOuPadrao(esquema)];
  const titularesIds = useMemo(
    () => new Set(slotIds.filter((id) => id > 0)),
    [slotIds],
  );
  const bancoSet = useMemo(
    () => new Set(bancoIds.filter((id) => id > 0 && !titularesIds.has(id))),
    [bancoIds, titularesIds],
  );
  const reservas = bancoIds
    .map((id) => porId.get(id))
    .filter((j): j is Jogador => j != null && !titularesIds.has(j.id));
  const foraDaLista = useMemo(
    () => elenco.filter((j) => !titularesIds.has(j.id) && !bancoSet.has(j.id)),
    [elenco, titularesIds, bancoSet],
  );
  const bancoCompleto = reservas.length >= RESERVAS_PARTIDA;

  const [foraPos, setForaPos] = useState<Posicao | 'TODAS'>('TODAS');
  const [foraSort, setForaSort] = useState('ovr');
  const foraFiltrado = useMemo(
    () =>
      aplicarPlayerListQuery(
        foraDaLista,
        jogadorAccessors,
        { ...FILTERS_VAZIOS, posicao: foraPos },
        { id: foraSort, dir: 'desc' },
        SORT_MERCADO,
      ),
    [foraDaLista, foraPos, foraSort],
  );

  return (
    <div
      className={`flex flex-col gap-3 ${compact ? 'max-h-[min(64vh,480px)]' : ''} overflow-hidden`}
    >
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Relacione 11 titulares + 11 reservas. Toque em “fora da lista” para incluir no banco.
      </p>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="mb-1.5 text-xs font-semibold text-emerald-400">
          Titulares ({slotIds.filter((id) => id > 0).length}/11)
        </h3>
        <ul className="space-y-1">
          {slotIds.map((id, i) => {
            const j = porId.get(id);
            const cel = grade11[i];
            const sigla =
              cel != null ? rotuloPosicaoCampinho(cel) : (slots[i] ?? j?.posicao ?? '—').slice(0, 3);
            const pos = j ? rotuloPosicao(j.posicao) : '—';
            const bloqueado = j != null && bloqueadoPorLesaoComEnergiaBaixa(j);
            const aviso = j ? rotuloBloqueioLesaoEnergia(j) : null;
            return (
              <li key={`slot-${i}`}>
                <MiniJogador
                  nome={j ? j.nome : '—'}
                  detalhe={
                    bloqueado
                      ? `⚠ ${aviso ?? 'Indisponível'}`
                      : `${sigla} · ${pos}`
                  }
                  ovr={j?.overall ?? 0}
                  energia={j?.energia}
                  ativo={slotAtivo === i}
                  titular
                  bloqueado={bloqueado}
                  titleBloqueio={aviso}
                  arrastando={j != null && arrastandoJogadorId === j.id}
                  onArrastar={(e) => {
                    if (j == null || bloqueado) return;
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
        <h3
          className={`mb-1.5 text-xs font-semibold ${
            bancoCompleto ? 'text-sky-400' : 'text-amber-400'
          }`}
        >
          Reservas relacionadas ({reservas.length}/{RESERVAS_PARTIDA})
        </h3>
        <ul className="space-y-1">
          {reservas.length === 0 ? (
            <li className="text-xs text-zinc-500">
              Nenhuma reserva. Toque em um jogador em “fora da lista”.
            </li>
          ) : (
            reservas.map((j) => {
              const bloqueado = bloqueadoPorLesaoComEnergiaBaixa(j);
              const aviso = rotuloBloqueioLesaoEnergia(j);
              return (
                <li key={j.id}>
                  <MiniJogador
                    nome={nomeCurto(j.nome)}
                    detalhe={
                      bloqueado
                        ? `⚠ ${aviso ?? 'Não pode jogar'}`
                        : `${rotuloPosicao(j.posicao)} · toque p/ tirar do banco`
                    }
                    ovr={j.overall}
                    energia={j.energia}
                    ativo={reservaAtiva === j.id}
                    bloqueado={bloqueado}
                    titleBloqueio={aviso}
                    arrastando={arrastandoJogadorId === j.id}
                    alvoSubstituicao={slotAguardandoReserva != null && !bloqueado}
                    onArrastar={(e) => {
                      if (bloqueado) return;
                      e.preventDefault();
                      onArrastarJogador?.(j.id);
                    }}
                    onSoltar={() => {
                      if (!bloqueado) onSoltarReservaComCampo?.(j.id);
                    }}
                    onClick={() => {
                      if (bloqueado) return;
                      if (slotAguardandoReserva != null) {
                        onReservaClick(j.id);
                        return;
                      }
                      onToggleBanco(j.id);
                    }}
                  />
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-800 pt-2">
        <h3 className="mb-1.5 text-xs font-semibold text-zinc-400">
          Fora da lista ({foraFiltrado.length}
          {foraFiltrado.length !== foraDaLista.length ? `/${foraDaLista.length}` : ''})
        </h3>
        {foraDaLista.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            <select
              value={foraPos}
              onChange={(e) => setForaPos(e.target.value as Posicao | 'TODAS')}
              className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-300"
              aria-label="Filtrar posição"
            >
              {POSICOES_FILTRO.map((p) => (
                <option key={p} value={p}>
                  {p === 'TODAS' ? 'Posição' : p}
                </option>
              ))}
            </select>
            <select
              value={foraSort}
              onChange={(e) => setForaSort(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-300"
              aria-label="Ordenar fora da lista"
            >
              {SORT_MERCADO.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <ul className="space-y-1">
          {foraDaLista.length === 0 ? (
            <li className="text-xs text-zinc-500">Todos relacionados.</li>
          ) : foraFiltrado.length === 0 ? (
            <li className="text-xs text-zinc-500">Nenhum com esse filtro.</li>
          ) : (
            foraFiltrado.map((j) => {
              const bloqueado = bloqueadoPorLesaoComEnergiaBaixa(j);
              const aviso = rotuloBloqueioLesaoEnergia(j);
              return (
                <li key={j.id}>
                  <MiniJogador
                    nome={nomeCurto(j.nome)}
                    detalhe={
                      bloqueado
                        ? `⚠ ${aviso ?? 'Não pode jogar'}`
                        : bancoCompleto
                          ? `${rotuloPosicao(j.posicao)} · banco cheio`
                          : `${rotuloPosicao(j.posicao)} · toque p/ relacionar`
                    }
                    ovr={j.overall}
                    energia={j.energia}
                    ativo={reservaAtiva === j.id}
                    bloqueado={bloqueado}
                    titleBloqueio={aviso}
                    arrastando={arrastandoJogadorId === j.id}
                    onArrastar={(e) => {
                      if (bloqueado) return;
                      e.preventDefault();
                      onArrastarJogador?.(j.id);
                    }}
                    onClick={() => {
                      if (bloqueado) return;
                      if (slotAguardandoReserva != null || reservaAtiva != null) {
                        onReservaClick(j.id);
                        return;
                      }
                      onToggleBanco(j.id);
                    }}
                  />
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
