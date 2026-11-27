import { useState } from 'react';
import type { EstadoTemporada } from '../../career/brasileirao';
import { estatisticasParciais } from '../../engine/matchStats';
import type { MatchSimResult } from '../../engine/matchEngine';
import type { InfoJogadorPartida } from '../../engine/jogadorDaPartida';
import type { CampeonatoConfig, Time } from '../../types/schema';
import { MatchEventTimeline } from './MatchEventTimeline';
import { MatchMomentum } from './MatchMomentum';
import { MatchPreGame } from './MatchPreGame';
import { MatchStatsPanel } from './MatchStatsPanel';
import { MatchClassificacaoPanel } from './MatchClassificacaoPanel';
import {
  MatchPlayback,
  type PlaybackProgress,
  type VelocidadePlayback,
} from '../MatchPlayback';
import { CmBtn } from '../cm/CmShell';

type Aba = 'comentario' | 'estatisticas' | 'classificacao' | 'prejogo' | 'detalhes';

type Props = {
  result: MatchSimResult;
  mandanteNome: string;
  visitanteNome: string;
  estadio?: string;
  jogadoresInfo?: ReadonlyMap<number, InfoJogadorPartida> | Readonly<Record<number, InfoJogadorPartida>>;
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
  skipToEndNonce?: number;
  onIrProFimDoJogo?: () => void;
  /** Final score only: leave transmission and return to escritório / hub. */
  onFinalizarJogo?: () => void;
  /** Classificação ao vivo do campeonato (modo liga). */
  classificacao?: {
    estado: EstadoTemporada;
    campeonato: CampeonatoConfig;
    times: Time[];
    partidaAoVivoId: number;
    mandanteId: string;
    visitanteId: string;
  } | null;
};

export function MatchCenter({
  result,
  mandanteNome,
  visitanteNome,
  estadio,
  jogadoresInfo,
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
  skipToEndNonce = 0,
  onIrProFimDoJogo,
  onFinalizarJogo,
  classificacao = null,
}: Props) {
  const [aba, setAba] = useState<Aba>('comentario');
  const [minuto, setMinuto] = useState(resumePlayback?.minuto ?? 0);
  const [progresso, setProgresso] = useState<PlaybackProgress>(
    resumePlayback ?? { idx: 0, golsM: 0, golsV: 0, minuto: 0 },
  );
  const [syncKey, setSyncKey] = useState(playbackKey ?? '0');
  if ((playbackKey ?? '0') !== syncKey) {
    const base = resumePlayback ?? { idx: 0, golsM: 0, golsV: 0, minuto: 0 };
    setSyncKey(playbackKey ?? '0');
    setProgresso(base);
    setMinuto(base.minuto);
  }

  const stats =
    result.estatisticas &&
    estatisticasParciais(result, minuto, result.mandanteId);

  const lancamentosVisiveis = result.lancamentos.slice(0, progresso.idx);

  const abas: { id: Aba; label: string }[] = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'estatisticas', label: 'Estatísticas' },
    ...(classificacao ? [{ id: 'classificacao' as const, label: 'Classificação' }] : []),
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

      {aba === 'comentario' && (
        <MatchEventTimeline
          lancamentos={lancamentosVisiveis}
          mandanteId={result.mandanteId}
          placarAtual={{ m: progresso.golsM, v: progresso.golsV }}
        />
      )}

      {/* Mantém montado para não resetar placar/tempo ao trocar de aba */}
      <div className={mostrarPlayback ? undefined : 'hidden'} aria-hidden={!mostrarPlayback}>
        <MatchPlayback
          result={result}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          jogadoresInfo={jogadoresInfo}
          velocidade={velocidade}
          pausado={pausado}
          onPausado={onPausado}
          onMinuto={(m) => {
            setMinuto(m);
            onMinuto(m);
          }}
          onProgress={(p) => {
            setProgresso((prev) =>
              prev.idx === p.idx &&
              prev.golsM === p.golsM &&
              prev.golsV === p.golsV &&
              prev.minuto === p.minuto
                ? prev
                : p,
            );
            onPlaybackProgress?.(p);
          }}
          resumeFrom={resumePlayback}
          playbackKey={playbackKey}
          onIntervalo={onIntervalo}
          skipToEndNonce={skipToEndNonce}
        />
      </div>

      {aba === 'estatisticas' && stats && (
        <MatchStatsPanel
          mandante={stats.mandante}
          visitante={stats.visitante}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
        />
      )}

      {aba === 'classificacao' && classificacao && (
        <MatchClassificacaoPanel
          estado={classificacao.estado}
          campeonato={classificacao.campeonato}
          times={classificacao.times}
          partidaAoVivoId={classificacao.partidaAoVivoId}
          resultAoVivo={result}
          minuto={minuto}
          mandanteId={classificacao.mandanteId}
          visitanteId={classificacao.visitanteId}
        />
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

      {result.estatisticas?.momento && (
        <MatchMomentum
          momento={result.estatisticas.momento}
          minutoAtual={minuto}
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
        {aoVivo && onIrProFimDoJogo && (
          <CmBtn onClick={onIrProFimDoJogo}>ir pro fim do jogo</CmBtn>
        )}
        {!aoVivo && onFinalizarJogo && (
          <CmBtn variant="primary" onClick={onFinalizarJogo}>
            Finalizar jogo
          </CmBtn>
        )}
      </div>
    </div>
  );
}
