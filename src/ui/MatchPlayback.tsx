import { useEffect, useRef, useState } from 'react';
import { tocarComemoracaoTorcidaGol } from '../audio/torcidaGol';
import type { Lancamento, MatchSimResult } from '../engine/matchEngine';

export type VelocidadePlayback = 0.5 | 1 | 2 | 4;

export type PlaybackProgress = {
  idx: number;
  golsM: number;
  golsV: number;
  minuto: number;
};

type Props = {
  result: MatchSimResult;
  mandanteNome: string;
  visitanteNome: string;
  velocidade?: VelocidadePlayback;
  pausado?: boolean;
  onPausado?: (p: boolean) => void;
  onMinuto?: (minuto: number) => void;
  onProgress?: (p: PlaybackProgress) => void;
  resumeFrom?: PlaybackProgress | null;
  playbackKey?: string;
  /** Disparado uma vez ao consumir o lance de intervalo. */
  onIntervalo?: () => void;
};

function delayMs(atual: Lancamento, anterior: Lancamento | null, velocidade: number): number {
  const gapMin = Math.max(0, atual.minuto - (anterior?.minuto ?? 0));
  const base = atual.tipo === 'inicio' ? 1000 : Math.max(900, gapMin * 170);
  return base / velocidade;
}

const tipoClasse: Record<Lancamento['tipo'], string> = {
  inicio: 'text-zinc-400',
  intervalo: 'text-amber-400 font-medium',
  fim: 'text-emerald-400 font-semibold',
  gol: 'text-yellow-300 font-semibold',
  chance: 'text-zinc-300',
  defesa: 'text-sky-300',
  cartao_amarelo: 'text-orange-400',
  lesao: 'text-rose-400 font-medium',
  substituicao: 'text-sky-200',
  wo: 'text-rose-300 font-semibold',
};

export function MatchPlayback({
  result,
  mandanteNome,
  visitanteNome,
  velocidade = 1,
  pausado = false,
  onMinuto,
  onProgress,
  resumeFrom = null,
  playbackKey,
  onIntervalo,
}: Props) {
  const [idx, setIdx] = useState(resumeFrom?.idx ?? 0);
  const [placar, setPlacar] = useState({ m: resumeFrom?.golsM ?? 0, v: resumeFrom?.golsV ?? 0 });
  const [aoVivo, setAoVivo] = useState(true);
  const listaRef = useRef<HTMLUListElement>(null);
  const intervaloDisparadoRef = useRef(false);
  const lanc = result.lancamentos;

  useEffect(() => {
    if (resumeFrom) {
      setIdx(resumeFrom.idx);
      setPlacar({ m: resumeFrom.golsM, v: resumeFrom.golsV });
      const jaPassouIntervalo = lanc
        .slice(0, resumeFrom.idx)
        .some((l) => l.tipo === 'intervalo');
      intervaloDisparadoRef.current = jaPassouIntervalo;
    } else {
      setIdx(0);
      setPlacar({ m: 0, v: 0 });
      intervaloDisparadoRef.current = false;
    }
    setAoVivo(true);
  }, [result, playbackKey]); // resumeFrom sync only on key/result change — avoid reset loops

  useEffect(() => {
    if (pausado || !aoVivo || idx >= lanc.length) return;

    const atual = lanc[idx];
    const anterior = idx > 0 ? lanc[idx - 1] : null;
    const t = window.setTimeout(() => {
      if (atual.tipo === 'gol') {
        tocarComemoracaoTorcidaGol();
        setPlacar((p) =>
          atual.timeId === result.mandanteId
            ? { ...p, m: p.m + 1 }
            : { ...p, v: p.v + 1 },
        );
      }
      setIdx((i) => i + 1);
      if (atual.tipo === 'intervalo' && !intervaloDisparadoRef.current) {
        intervaloDisparadoRef.current = true;
        onIntervalo?.();
      }
    }, delayMs(atual, anterior, velocidade));

    return () => window.clearTimeout(t);
  }, [idx, lanc, result.mandanteId, aoVivo, velocidade, pausado, onIntervalo]);

  useEffect(() => {
    if (idx >= lanc.length) setAoVivo(false);
  }, [idx, lanc.length]);

  const visiveis = lanc.slice(0, idx);
  const relogio = visiveis.length ? visiveis[visiveis.length - 1].minuto : 0;

  useEffect(() => {
    onMinuto?.(relogio);
    onProgress?.({ idx, golsM: placar.m, golsV: placar.v, minuto: relogio });
  }, [relogio, onMinuto, onProgress, idx, placar.m, placar.v]);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [idx]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-left">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-medium text-zinc-100">
          {mandanteNome}{' '}
          <span className="tabular-nums text-emerald-400">
            {placar.m} × {placar.v}
          </span>{' '}
          {visitanteNome}
        </div>
        <div className="text-sm text-zinc-500">
          {aoVivo ? `${relogio}'` : '90′ · Final'}
          {aoVivo && !pausado && (
            <span className="ml-2 animate-pulse text-red-400">● Ao vivo</span>
          )}
          {pausado && <span className="ml-2 text-amber-400">‖ Pausado</span>}
        </div>
      </div>

      <ul
        ref={listaRef}
        className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm"
        aria-live="polite"
      >
        {visiveis.map((l, i) => (
          <li
            key={`${i}-${l.minuto}-${l.tipo}`}
            className={`border-l-2 border-zinc-700 pl-3 ${tipoClasse[l.tipo]}`}
          >
            {l.texto}
          </li>
        ))}
        {aoVivo && !pausado && idx < lanc.length && (
          <li className="pl-3 text-xs text-zinc-600">Aguardando próximo lance…</li>
        )}
      </ul>

      {!aoVivo && idx >= lanc.length && (
        <p className="mt-2 text-xs text-zinc-500">
          Resultado final: {result.golsMandante} × {result.golsVisitante}
        </p>
      )}
    </div>
  );
}
