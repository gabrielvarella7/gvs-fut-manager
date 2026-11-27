import { useState } from 'react';
import { estatisticasParciais } from '../../engine/matchStats';
import type { MatchSimResult } from '../../engine/matchEngine';
import { MatchMomentum } from './MatchMomentum';
import { MatchPreGame } from './MatchPreGame';
import { MatchStatsPanel } from './MatchStatsPanel';
import {
  MatchPlayback,
  type PlaybackProgress,
  type VelocidadePlayback,
} from '../MatchPlayback';
import { CmBtn } from '../cm/CmShell';

type Aba = 'comentario' | 'estatisticas' | 'prejogo' | 'detalhes';

type Props = {
  result: MatchSimResult;
  mandanteNome: string;
  visitanteNome: string;
  estadio?: string;
  velocidade: VelocidadePlayback;
  onVelocidade: (v: VelocidadePlayback) => void;
  pausado: boolean;
  onPausado: (p: boolean) => void;
  onMinuto: (minuto: number) => void;
  aoVivo: boolean;
  onTaticas: () => void;
  onPlaybackProgress?: (p: PlaybackProgress) => void;
  resumePlayback?: PlaybackProgress | null;
  playbackKey?: string;
  /** Intervalo: partida pausada até o usuário iniciar o 2º tempo. */
  aguardandoSegundoTempo?: boolean;
  onIniciarSegundoTempo?: () => void;
  onIntervalo?: () => void;
};

export function MatchCenter({
  result,
  mandanteNome,
  visitanteNome,
  estadio,
  velocidade,
  onVelocidade,
  pausado,
  onPausado,
  onMinuto,
  aoVivo,
  onTaticas,
  onPlaybackProgress,
  resumePlayback,
  playbackKey,
  aguardandoSegundoTempo = false,
  onIniciarSegundoTempo,
  onIntervalo,
}: Props) {
  const [aba, setAba] = useState<Aba>('comentario');
  const [minuto, setMinuto] = useState(0);

  const stats =
    result.estatisticas &&
    estatisticasParciais(result, minuto, result.mandanteId);

  const abas: { id: Aba; label: string }[] = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'estatisticas', label: 'Estatísticas' },
    { id: 'comentario', label: 'Comentário' },
    { id: 'prejogo', label: 'Pré-jogo' },
  ];

  const mostrarPlayback = aba === 'comentario' || aba === 'detalhes';

  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              aba === a.id
                ? 'bg-emerald-900 text-emerald-100'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {a.label}
          </button>
        ))}
      </nav>

      {/* Mantém montado para não resetar placar/tempo ao trocar de aba */}
      <div className={mostrarPlayback ? undefined : 'hidden'} aria-hidden={!mostrarPlayback}>
        <MatchPlayback
          result={result}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          velocidade={velocidade}
          pausado={pausado}
          onPausado={onPausado}
          onMinuto={(m) => {
            setMinuto(m);
            onMinuto(m);
          }}
          onProgress={onPlaybackProgress}
          resumeFrom={resumePlayback}
          playbackKey={playbackKey}
          onIntervalo={onIntervalo}
        />
      </div>

      {aba === 'estatisticas' && stats && (
        <>
          <MatchStatsPanel
            mandante={stats.mandante}
            visitante={stats.visitante}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
          <MatchMomentum
            momento={result.estatisticas.momento}
            minutoAtual={minuto}
            mandanteNome={mandanteNome}
            visitanteNome={visitanteNome}
          />
        </>
      )}

      {aba === 'prejogo' && (
        <MatchPreGame
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          estadio={estadio}
          preJogo={result.preJogo}
        />
      )}

      {aba === 'detalhes' && stats && (
        <MatchStatsPanel
          mandante={stats.mandante}
          visitante={stats.visitante}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
        />
      )}

      {aguardandoSegundoTempo && (
        <div className="rounded border border-amber-700/60 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">
          <p className="font-medium">Intervalo</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Ajuste táticas se quiser. O segundo tempo só começa quando você confirmar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CmBtn
              onClick={() => {
                onIniciarSegundoTempo?.();
              }}
            >
              Iniciar o segundo tempo
            </CmBtn>
            <CmBtn
              variant="ghost"
              onClick={() => {
                onPausado(true);
                onTaticas();
              }}
            >
              Táticas
            </CmBtn>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
        {!aguardandoSegundoTempo && (
          <CmBtn variant="ghost" onClick={() => onPausado(!pausado)}>
            {pausado ? 'Retomar' : 'Pausar'}
          </CmBtn>
        )}
        <CmBtn
          variant="ghost"
          onClick={() => {
            onPausado(true);
            onTaticas();
          }}
        >
          Táticas
        </CmBtn>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Velocidade
          <select
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1"
            value={velocidade}
            onChange={(e) => onVelocidade(Number(e.target.value) as VelocidadePlayback)}
          >
            <option value={0.5}>0,5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
        {aoVivo && (
          <span className="text-xs text-red-400 animate-pulse">● {minuto}&apos;</span>
        )}
      </div>
    </div>
  );
}
