import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMPO_PERSPECTIVA } from '../../data/campinhoLayout';
import {
  celulaMaisProxima,
  COL_X_GRADE,
  COLS_LINHA,
  coordsDeGrade,
  LINHAS_CAMPO,
  mesmaCelula,
  posicaoNaCelula,
  rotuloPosicaoCampinho,
  ROW_Y,
  type CelulaGrade,
} from '../../data/gradeCampinho';
import { SLOTS_POR_ESQUEMA, esquemaOuPadrao } from '../../data/esquemasTaticos';
import {
  grauDesvioPosicao,
  overallEfetivoEmCampo,
  rotuloGrauDesvio,
} from '../../engine/posicaoCompatibilidade';
import type { EsquemaTatico, Jogador, Posicao } from '../../types/schema';

type Props = {
  esquema: EsquemaTatico;
  rotulo: string;
  elenco: Jogador[];
  slotIds: number[];
  grade11: CelulaGrade[];
  onTrocarJogadores: (a: number, b: number) => void;
  onMoverSlotGrade: (slot: number, destino: CelulaGrade) => void;
  /** Arraste do elenco (reserva/titular) para um slot no campo */
  arrastandoJogadorId?: number | null;
  onSoltarJogadorNoSlot?: (slot: number) => void;
  onArrastoElencoCancelado?: () => void;
  /** Soltou o arraste do campo fora do gramado (substituição para o banco) */
  onArrastoSaiuDoCampo?: (slot: number) => void;
};

function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] ?? nome;
  return p.length > 12 ? `${p.slice(0, 11)}…` : p;
}

export function TacticPitch({
  esquema,
  rotulo,
  elenco,
  slotIds,
  grade11,
  onTrocarJogadores,
  onMoverSlotGrade,
  arrastandoJogadorId = null,
  onSoltarJogadorNoSlot,
  onArrastoElencoCancelado,
  onArrastoSaiuDoCampo,
}: Props) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const origemRef = useRef<number | null>(null);
  const ignorarClickRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [hover, setHover] = useState<CelulaGrade | null>(null);
  const [hoverSlotExterno, setHoverSlotExterno] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const esquemaKey = esquemaOuPadrao(esquema);
  const slots = SLOTS_POR_ESQUEMA[esquemaKey];
  const coords = coordsDeGrade(grade11);
  const porId = new Map(elenco.map((j) => [j.id, j]));

  const slotJogador = (i: number) => {
    const id = slotIds[i];
    const j = id != null ? porId.get(id) : undefined;
    const cel = grade11[i];
    const pos =
      cel != null ? posicaoNaCelula(cel) : (slots[i] ?? (j?.posicao as Posicao) ?? 'MEI');
    const rotulo =
      cel != null
        ? rotuloPosicaoCampinho(cel)
        : pos === 'LAT'
          ? 'LAT'
          : pos.slice(0, 3);
    const nome = j?.nome ?? '—';
    const overall = j?.overall;
    const ovrEfetivo =
      j != null ? overallEfetivoEmCampo(j.overall, j.posicao, pos) : undefined;
    const foraPos =
      j != null ? grauDesvioPosicao(j.posicao, pos) : 'ideal';
    const textoOvr =
      overall != null && ovrEfetivo != null
        ? foraPos !== 'ideal' && ovrEfetivo < overall
          ? `:${ovrEfetivo} (${overall})`
          : `:${overall}`
        : '';
    return {
      nome,
      overall,
      ovrEfetivo,
      foraPos,
      pos,
      rotulo,
      rotuloNome:
        nome !== '—' && textoOvr
          ? `${primeiroNome(nome)} ${textoOvr}`
          : primeiroNome(nome),
      dicaDesvio: j ? rotuloGrauDesvio(foraPos) : '',
    };
  };

  const pontoTela = useCallback((clientX: number, clientY: number) => {
    const pitch = pitchRef.current?.getBoundingClientRect();
    if (!pitch) return null;
    return {
      px: ((clientX - pitch.left) / pitch.width) * 100,
      py: ((clientY - pitch.top) / pitch.height) * 100,
    };
  }, []);

  const slotDoPonto = useCallback(
    (clientX: number, clientY: number): number | null => {
      const pt = pontoTela(clientX, clientY);
      if (!pt) return null;
      let melhor: number | null = null;
      let menorDist = coarsePointer ? 22 : 14;
      for (let i = 0; i < coords.length; i++) {
        const d = Math.hypot(pt.px - coords[i].x, pt.py - coords[i].y);
        if (d < menorDist) {
          menorDist = d;
          melhor = i;
        }
      }
      return melhor;
    },
    [coarsePointer, coords, pontoTela],
  );

  const celulaNoPonto = useCallback(
    (clientX: number, clientY: number): CelulaGrade | null => {
      const pt = pontoTela(clientX, clientY);
      if (!pt) return null;
      return celulaMaisProxima(pt.px, pt.py);
    },
    [pontoTela],
  );

  const trocarSePossivel = useCallback(
    (origem: number, alvo: number) => {
      if (origem !== alvo) onTrocarJogadores(origem, alvo);
    },
    [onTrocarJogadores],
  );

  const liberarArrasto = useCallback(
    (clientX: number, clientY: number) => {
      const origem = origemRef.current;
      origemRef.current = null;
      pointerIdRef.current = null;
      setArrastando(null);
      setHover(null);
      setDragPos(null);
      if (origem == null) return;

      if (grade11[origem]?.gol) {
        return;
      }

      const pitch = pitchRef.current?.getBoundingClientRect();
      const margem = 6;
      const foraDoCampo =
        !pitch ||
        clientX < pitch.left - margem ||
        clientX > pitch.right + margem ||
        clientY < pitch.top - margem ||
        clientY > pitch.bottom + margem;
      if (foraDoCampo) {
        ignorarClickRef.current = true;
        onArrastoSaiuDoCampo?.(origem);
        return;
      }

      const celula = celulaNoPonto(clientX, clientY);
      const alvoSlot = slotDoPonto(clientX, clientY);

      if (celula && !celula.gol) {
        const atual = grade11[origem];
        if (!mesmaCelula(atual, celula)) {
          ignorarClickRef.current = true;
          onMoverSlotGrade(origem, celula);
          return;
        }
      }

      if (alvoSlot != null && alvoSlot !== origem) {
        ignorarClickRef.current = true;
        trocarSePossivel(origem, alvoSlot);
      }
    },
    [celulaNoPonto, grade11, onArrastoSaiuDoCampo, onMoverSlotGrade, slotDoPonto, trocarSePossivel],
  );

  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      if (origemRef.current == null) return;
      liberarArrasto(e.clientX, e.clientY);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [liberarArrasto]);

  useEffect(() => {
    if (arrastandoJogadorId == null) {
      setHoverSlotExterno(null);
      return;
    }
    const onUp = (e: PointerEvent) => {
      const slot = slotDoPonto(e.clientX, e.clientY);
      if (slot != null) onSoltarJogadorNoSlot?.(slot);
      else onArrastoElencoCancelado?.();
      setHoverSlotExterno(null);
    };
    const onMove = (e: PointerEvent) => {
      setHoverSlotExterno(slotDoPonto(e.clientX, e.clientY));
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      setHoverSlotExterno(null);
    };
  }, [
    arrastandoJogadorId,
    onArrastoElencoCancelado,
    onSoltarJogadorNoSlot,
    slotDoPonto,
  ]);

  const onPointerDownSlot = (i: number, e: React.PointerEvent) => {
    if (grade11[i]?.gol) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointerIdRef.current = e.pointerId;
    origemRef.current = i;
    setArrastando(i);
    setHover(grade11[i] ?? null);
    setSelecionado(null);
    const pt = pontoTela(e.clientX, e.clientY);
    if (pt) setDragPos({ x: pt.px, y: pt.py });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (origemRef.current == null) return;
    setHover(celulaNoPonto(e.clientX, e.clientY));
    const pt = pontoTela(e.clientX, e.clientY);
    if (pt) setDragPos({ x: pt.px, y: pt.py });
  };

  const onClickSlot = (i: number) => {
    if (ignorarClickRef.current) {
      ignorarClickRef.current = false;
      return;
    }
    if (selecionado == null) {
      setSelecionado(i);
      return;
    }
    if (selecionado === i) {
      setSelecionado(null);
      return;
    }
    trocarSePossivel(selecionado, i);
    setSelecionado(null);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className="w-full overflow-hidden px-1 pb-3 pt-2"
        style={{ perspective: `${CAMPO_PERSPECTIVA.perspectivePx}px` }}
      >
        <div
          ref={pitchRef}
          className="relative mx-auto aspect-[68/105] w-full max-h-[min(78vh,580px)] min-h-[300px] max-w-full select-none rounded-lg border-2 border-emerald-800/90 bg-emerald-950/40 bg-[repeating-linear-gradient(0deg,rgba(6,78,59,0.55)_0px,rgba(6,78,59,0.55)_22px,rgba(4,47,46,0.45)_22px,rgba(4,47,46,0.45)_44px)] shadow-[0_20px_36px_-14px_rgba(0,0,0,0.5)]"
          style={{
            transform: `rotateX(${CAMPO_PERSPECTIVA.rotateX}deg) scale(${CAMPO_PERSPECTIVA.scale})`,
            transformOrigin: `50% ${CAMPO_PERSPECTIVA.originY}`,
            touchAction: 'none',
          }}
          onPointerMove={onPointerMove}
        >
          <FieldLines />
          <GradeInvisivel destaque={hover} arrastando={arrastando != null} />
          {coords.map((c, i) => {
            const j = slotJogador(i);
            const ativo = arrastando === i || selecionado === i;
            const cel = grade11[i];
            const alvo =
              (hover != null &&
                arrastando != null &&
                arrastando !== i &&
                cel &&
                mesmaCelula(hover, cel)) ||
              (arrastandoJogadorId != null && hoverSlotExterno === i);
            const alvoReserva = arrastandoJogadorId != null && hoverSlotExterno === i;
            const fantasmaAtivo = arrastando === i && dragPos != null;
            return (
              <div
                key={`slot-${i}-${slotIds[i]}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-150 ease-out"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  zIndex: ativo ? 20 : 1,
                  opacity: fantasmaAtivo ? 0.35 : 1,
                }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => onPointerDownSlot(i, e)}
                  onClick={() => onClickSlot(i)}
                  style={{ touchAction: 'none' }}
                  className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 bg-zinc-900 text-[10px] font-bold shadow-md ${
                    ativo
                      ? 'scale-110 border-amber-400 text-amber-100'
                      : alvoReserva
                        ? 'scale-110 border-yellow-400 bg-yellow-950/40 text-yellow-100'
                        : alvo
                          ? 'scale-105 border-sky-400 text-sky-100'
                          : 'border-emerald-400 text-emerald-100 hover:border-emerald-300'
                  }`}
                  title={`${j.nome} (${j.rotulo})${j.dicaDesvio ? ` · ${j.dicaDesvio}` : ''} — arraste do elenco, outra posição ou clique em dois`}
                >
                  {j.rotulo}
                </button>
                <span
                  className={`mt-0.5 block min-w-[5.25rem] whitespace-nowrap text-center text-[8px] font-medium drop-shadow sm:text-[9px] ${
                    j.foraPos === 'muito_fora'
                      ? 'text-red-300'
                      : j.foraPos === 'improvisado'
                        ? 'text-amber-200'
                        : 'text-zinc-100'
                  }`}
                >
                  {j.rotuloNome}
                </span>
              </div>
            );
          })}
          {arrastando != null && dragPos && (
            <div
              className="pointer-events-none absolute z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${dragPos.x}%`, top: `${dragPos.y}%` }}
            >
              <div className="flex h-12 w-12 scale-110 items-center justify-center rounded-full border-2 border-amber-300 bg-zinc-900 text-[11px] font-bold text-amber-100 shadow-lg ring-2 ring-amber-400/40">
                {slotJogador(arrastando).rotulo}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 text-[10px] text-zinc-500">
        <span>
          Arraste a bolinha (celular ou PC) · elenco → campo · solte fora para reserva · ou toque em dois
        </span>
        <span className="text-zinc-600">{rotulo}</span>
      </div>
    </div>
  );
}

function GradeInvisivel({
  destaque,
  arrastando,
}: {
  destaque: CelulaGrade | null;
  arrastando: boolean;
}) {
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < LINHAS_CAMPO; row++) {
    for (let col = 0; col < COLS_LINHA; col++) {
      cells.push({ col, row });
    }
  }
  return (
    <>
      {cells.map(({ col, row }) => {
        const ativo =
          arrastando && destaque?.col === col && destaque?.row === row;
        return (
          <div
            key={`g-${col}-${row}`}
            className={`pointer-events-none absolute h-[14%] w-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
              ativo ? 'bg-sky-400/15 ring-1 ring-sky-400/40' : ''
            }`}
            style={{ left: `${COL_X_GRADE[col]}%`, top: `${ROW_Y[row]}%` }}
          />
        );
      })}
    </>
  );
}

function FieldLines() {
  return (
    <>
      <div className="pointer-events-none absolute inset-[3%] rounded-sm border border-emerald-200/35" />
      <div className="pointer-events-none absolute bottom-[3%] left-1/2 h-[14%] w-[48%] -translate-x-1/2 rounded-t border border-b-0 border-emerald-200/30" />
      <div className="pointer-events-none absolute top-[3%] left-1/2 h-[14%] w-[48%] -translate-x-1/2 rounded-b border border-t-0 border-emerald-200/30" />
      <div className="pointer-events-none absolute left-[3%] right-[3%] top-1/2 h-px -translate-y-1/2 bg-emerald-200/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/30" />
    </>
  );
}