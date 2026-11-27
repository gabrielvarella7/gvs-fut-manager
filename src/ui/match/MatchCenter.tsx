import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EstadoTemporada } from '../../career/brasileirao';
import type { DadosH2H } from '../../career/h2hMatch';
import {
  estatisticasParciais,
  type PeriodoEstatisticas,
} from '../../engine/matchStats';
import type { Lancamento, MatchSimResult } from '../../engine/matchEngine';
import type { TimeNotasInput } from '../../engine/matchNotas';
import type { InfoJogadorPartida } from '../../engine/jogadorDaPartida';
import type { CampeonatoConfig, Time } from '../../types/schema';
import type { InfoPartidaPreJogo } from '../../career/infoPartidaPreJogo';
import type { PacotePreJogoEquipes } from '../../career/preJogoEquipeStats';
import {
  MatchHighlightManager,
  bindHighlightControls,
  buildCm04HighlightClip,
  isDangerousChance,
  rosterFromEscalacao,
  synthesizeFrame,
  type HighlightClip,
  type HighlightMode,
  type HighlightRoster,
} from '../../engine/highlights';
import { MatchEventTimeline } from './MatchEventTimeline';
import { MatchH2HPanel } from './MatchH2HPanel';
import { MatchMomentum } from './MatchMomentum';
import { MatchNotasPitch } from './MatchNotasPitch';
import { MatchPreGame } from './MatchPreGame';
import { MatchStatsPanel } from './MatchStatsPanel';
import { MatchClassificacaoPanel } from './MatchClassificacaoPanel';
import { MatchHighlightOverlay } from './highlights/MatchHighlightOverlay';
import {
  MatchFormacoesPanel,
  type ArbitroFormacoes,
  type TimeFormacoesInfo,
} from './MatchFormacoesPanel';
import {
  MatchPlayback,
  type PlaybackProgress,
  type VelocidadePlayback,
} from '../MatchPlayback';
import { CmBtn } from '../cm/CmShell';

/**
 * Live-match tab ids — Sofascore-style bar.
 * resumo: controls → timeline → comentários
 */
export type MatchAba =
  | 'resumo'
  | 'comentario'
  | 'formacoes'
  | 'estatisticas'
  | 'classificacao'
  | 'h2h'
  | 'prejogo'
  | 'notas';

type Props = {
  result: MatchSimResult;
  mandanteNome: string;
  visitanteNome: string;
  estadio?: string;
  /** Dados de escalação/cores para a aba Notas. */
  notasMandante?: TimeNotasInput;
  notasVisitante?: TimeNotasInput;
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
  /** Dados para a aba Formações (read-only). */
  formacoesMandante?: TimeFormacoesInfo;
  formacoesVisitante?: TimeFormacoesInfo;
  arbitro?: ArbitroFormacoes | null;
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
  /** Stats de temporada para a aba Pré-jogo (ambos os times). */
  equipesPreJogo?: PacotePreJogoEquipes | null;
  infoPartida?: InfoPartidaPreJogo | null;
  /** Head-to-head panel data (liga ou torneio). */
  h2h?: DadosH2H | null;
  /** Optional live timeline override for Resumo. */
  resumoTimeline?: ReactNode;
  /** Optional Formações body override. */
  formacoesContent?: ReactNode;
  /** Optional Classificação body override. */
  classificacaoContent?: ReactNode;
  /** Optional H2H body override. */
  h2hContent?: ReactNode;
  /** Optional Notas / pitch ratings override. */
  notasContent?: ReactNode;
};

const MODE_LABEL: Record<HighlightMode, string> = {
  ON: 'ON',
  ONLY_GOALS: 'APENAS GOLS',
  OFF: 'OFF',
};

/** Hook slot for live event timeline on the Resumo tab. */
export function MatchResumoTimelineSlot({ children }: { children?: ReactNode }) {
  if (children) return <div data-match-resumo-timeline>{children}</div>;
  return (
    <div
      className="rounded-lg border border-zinc-700/80 bg-zinc-900/40 px-3 py-3"
      data-match-resumo-timeline
      aria-label="Linha do tempo da partida"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
        Resumo
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Linha do tempo ao vivo — conteúdo em construção.
      </p>
    </div>
  );
}

export function MatchCenter({
  result,
  mandanteNome,
  visitanteNome,
  estadio,
  notasMandante,
  notasVisitante,
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
  formacoesMandante,
  formacoesVisitante,
  arbitro = null,
  onFinalizarJogo,
  classificacao = null,
  equipesPreJogo = null,
  infoPartida = null,
  h2h = null,
  resumoTimeline,
  formacoesContent,
  classificacaoContent,
  h2hContent,
  notasContent,
}: Props) {
  const [aba, setAba] = useState<MatchAba>('resumo');
  const [minuto, setMinuto] = useState(resumePlayback?.minuto ?? 0);
  const [periodoStats, setPeriodoStats] = useState<PeriodoEstatisticas>('todos');
  const [progresso, setProgresso] = useState<PlaybackProgress>(
    resumePlayback ?? { idx: 0, golsM: 0, golsV: 0, minuto: 0 },
  );
  const [syncKey, setSyncKey] = useState(playbackKey ?? '0');
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('ON');
  const [activeClip, setActiveClip] = useState<HighlightClip | null>(null);
  const pausedForClipRef = useRef(false);

  if ((playbackKey ?? '0') !== syncKey) {
    const base = resumePlayback ?? { idx: 0, golsM: 0, golsV: 0, minuto: 0 };
    setSyncKey(playbackKey ?? '0');
    setProgresso(base);
    setMinuto(base.minuto);
  }

  const managerRef = useRef<MatchHighlightManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new MatchHighlightManager('ON');
  }
  const manager = managerRef.current;

  const roster: HighlightRoster = useMemo(() => {
    if (result.highlightRoster) return result.highlightRoster;
    return rosterFromEscalacao([], []);
  }, [result.highlightRoster]);

  const attackingHomeRef = useRef(true);
  const focusIdRef = useRef<number | undefined>(undefined);
  const clockRef = useRef(minuto);

  useEffect(() => {
    manager.clearBuffer();
    manager.setMode(highlightMode);
  }, [manager, playbackKey, highlightMode]);

  useEffect(() => {
    manager.onPlayHighlight(async (clip) => {
      pausedForClipRef.current = true;
      onPausado(true);
      setActiveClip(clip);
      await new Promise<void>((resolve) => {
        const done = () => {
          window.removeEventListener('mm-highlight-done', done);
          resolve();
        };
        window.addEventListener('mm-highlight-done', done);
      });
    });
  }, [manager, onPausado]);

  useEffect(() => {
    return bindHighlightControls('highlight-selector', manager);
  }, [manager]);

  useEffect(() => {
    if (highlightMode === 'OFF') return;
    if (pausado || activeClip || aguardandoSegundoTempo || !aoVivo) return;
    const hz = manager.getTicksPerSecond();
    const id = window.setInterval(() => {
      const frame = synthesizeFrame({
        clock: clockRef.current,
        roster,
        attackingHome: attackingHomeRef.current,
        phase: 0.35 + (Math.sin(clockRef.current) + 1) * 0.2,
        focusPlayerId: focusIdRef.current,
        seed: Date.now() % 100000,
      });
      manager.recordFrame(frame);
    }, 1000 / hz);
    return () => window.clearInterval(id);
  }, [
    highlightMode,
    pausado,
    activeClip,
    aguardandoSegundoTempo,
    aoVivo,
    manager,
    roster,
  ]);

  const onClipDone = useCallback(() => {
    setActiveClip(null);
    window.dispatchEvent(new Event('mm-highlight-done'));
    if (pausedForClipRef.current) {
      pausedForClipRef.current = false;
      onPausado(false);
    }
  }, [onPausado]);

  const handleLance = useCallback(
    async (l: Lancamento) => {
      const eventMinute = Math.floor(l.minuto);
      // Keep highlight clock locked to THIS lance — never an older buffered minute.
      clockRef.current = eventMinute;
      const attackingHome =
        l.tipo === 'gol' || l.tipo === 'chance'
          ? l.timeId === result.mandanteId
          : l.tipo === 'defesa'
            ? l.timeId !== result.mandanteId
            : attackingHomeRef.current;
      attackingHomeRef.current = attackingHome;
      focusIdRef.current = l.jogadorId;

      if (manager.getMode() === 'OFF') return;

      const triggerGoal = l.tipo === 'gol' && manager.shouldTrigger('GOAL');
      const triggerChance =
        (l.tipo === 'chance' || l.tipo === 'defesa' || l.tipo === 'cartao_amarelo') &&
        isDangerousChance(l.highlight) &&
        manager.shouldTrigger('DANGEROUS_CHANCE');

      if (!triggerGoal && !triggerChance) return;

      // Already showing a clip — do not queue a stale older minute over the live radar.
      if (manager.isPlaying() || activeClip) return;

      // Freeze live match clock NOW (sync) for the whole clip; resume after ENCERRAMENTO.
      pausedForClipRef.current = true;
      onPausado(true);

      const event = triggerGoal ? 'GOAL' : 'DANGEROUS_CHANCE';
      const clip = buildCm04HighlightClip({
        event,
        minuto: eventMinute,
        roster,
        attackingHome,
        autorId: l.jogadorId,
        assistenteNome: l.assistenteNome,
        highlight: l.highlight,
        tipoLance: l.tipo,
      });
      // Belt-and-suspenders: every frame clock === live event minute.
      clip.clockAtEvent = eventMinute;
      for (const f of clip.frames) f.clock = eventMinute;
      await manager.playClip(clip);
    },
    [manager, onPausado, result.mandanteId, roster, activeClip],
  );

  const stats =
    result.estatisticas &&
    estatisticasParciais(result, minuto, result.mandanteId, periodoStats);

  const temFormacoes = !!formacoesMandante && !!formacoesVisitante;
  const temNotas = !!notasMandante && !!notasVisitante;
  const lancamentosVisiveis = result.lancamentos.slice(0, progresso.idx);
  const partidaEncerrada = !aoVivo;

  const abas: { id: MatchAba; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'comentario', label: 'Comentário' },
    ...(temFormacoes || formacoesContent
      ? [{ id: 'formacoes' as const, label: 'Formações' }]
      : []),
    { id: 'estatisticas', label: 'Estatísticas' },
    ...(classificacao || classificacaoContent
      ? [{ id: 'classificacao' as const, label: 'Classificação' }]
      : []),
    ...(h2h || h2hContent ? [{ id: 'h2h' as const, label: 'H2H' }] : []),
    { id: 'prejogo', label: 'Pré-jogo' },
    ...(temNotas || notasContent ? [{ id: 'notas' as const, label: 'Notas' }] : []),
  ];

  const mostrarPlayback = aba === 'resumo' || aba === 'comentario';

  const timelineNode = resumoTimeline ?? (
    <MatchEventTimeline
      lancamentos={lancamentosVisiveis}
      mandanteId={result.mandanteId}
      placarAtual={{ m: progresso.golsM, v: progresso.golsV }}
    />
  );

  const highlightSelect = (
    <label className="flex items-center gap-2 text-xs text-zinc-400">
      Destaques 2D
      <select
        id="highlight-selector"
        className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 font-medium text-zinc-100"
        value={highlightMode}
        onChange={(e) => {
          const v = e.target.value as HighlightMode;
          setHighlightMode(v);
          manager.setMode(v);
        }}
        aria-label="Modo de destaques 2D"
      >
        <option value="ON">{MODE_LABEL.ON}</option>
        <option value="ONLY_GOALS">{MODE_LABEL.ONLY_GOALS}</option>
        <option value="OFF">{MODE_LABEL.OFF}</option>
      </select>
    </label>
  );

  const controlesPrincipais = (
    <>
      {!aguardandoSegundoTempo && (
        <CmBtn variant="ghost" onClick={() => onPausado(!pausado)} disabled={!!activeClip}>
          {pausado ? 'Iniciar' : 'Pausar'}
        </CmBtn>
      )}
      {partidaEncerrada && onFinalizarJogo && (
        <CmBtn variant="primary" onClick={onFinalizarJogo}>
          Finalizar partida
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
          className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
          value={velocidade}
          onChange={(e) => onVelocidade(Number(e.target.value) as VelocidadePlayback)}
        >
          <option value={0.5}>0,5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </label>
      {highlightSelect}
      {aoVivo && (
        <span className="text-xs text-red-400 animate-pulse">● {minuto}&apos;</span>
      )}
      {aoVivo && onIrProFimDoJogo && (
        <CmBtn variant="ghost" onClick={onIrProFimDoJogo}>
          Ir pro fim
        </CmBtn>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <nav
        className="relative -mx-1 overflow-x-auto border-b border-[var(--mm-border)]"
        aria-label="Abas da partida"
      >
        <div className="flex min-w-max gap-0 px-1">
          {abas.map((a) => {
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a.id)}
                className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors ${
                  ativa
                    ? 'font-semibold text-emerald-300'
                    : 'font-medium text-emerald-400/55 hover:text-emerald-300/85'
                }`}
              >
                {a.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-1 bottom-0 h-0.5 rounded-full transition-opacity ${
                    ativa ? 'bg-emerald-400 opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {aba === 'resumo' && (
        <div className="space-y-3" data-match-aba="resumo">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-2.5">
            {controlesPrincipais}
          </div>
          <MatchResumoTimelineSlot>{timelineNode}</MatchResumoTimelineSlot>
        </div>
      )}

      {/* Mantém montado para não resetar placar/tempo ao trocar de aba */}
      <div
        className={mostrarPlayback ? undefined : 'hidden'}
        aria-hidden={!mostrarPlayback}
        data-match-comentarios
      >
        {aba === 'comentario' && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
            Comentário
          </p>
        )}
        <MatchPlayback
          result={result}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          jogadoresInfo={jogadoresInfo}
          velocidade={velocidade}
          pausado={pausado || !!activeClip}
          onPausado={onPausado}
          onMinuto={(m) => {
            clockRef.current = m;
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
          onLanceConsumido={handleLance}
        />
      </div>

      {aba === 'estatisticas' && stats && (
        <MatchStatsPanel
          mandante={stats.mandante}
          visitante={stats.visitante}
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          periodo={periodoStats}
          onPeriodo={setPeriodoStats}
        />
      )}

      {aba === 'classificacao' &&
        (classificacaoContent ??
          (classificacao && (
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
          )))}

      {aba === 'prejogo' && (
        <MatchPreGame
          mandanteNome={mandanteNome}
          visitanteNome={visitanteNome}
          estadio={estadio}
          preJogo={result.preJogo}
          equipes={equipesPreJogo}
          infoPartida={infoPartida}
        />
      )}

      {aba === 'notas' &&
        (notasContent ??
          (temNotas && (
            <MatchNotasPitch
              result={result}
              minuto={minuto}
              mandante={notasMandante}
              visitante={notasVisitante}
            />
          )))}

      {aba === 'h2h' && (h2hContent ?? (h2h && <MatchH2HPanel dados={h2h} />))}

      {aba === 'formacoes' &&
        (formacoesContent ??
          (temFormacoes && (
            <MatchFormacoesPanel
              result={result}
              minuto={minuto}
              mandante={formacoesMandante}
              visitante={formacoesVisitante}
              arbitro={arbitro}
            />
          )))}

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

      {aba !== 'resumo' && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
          {controlesPrincipais}
        </div>
      )}

      <MatchHighlightOverlay
        clip={activeClip}
        ticksPerSecond={manager.getTicksPerSecond()}
        playbackSpeed={manager.getPlaybackSpeed()}
        onDone={onClipDone}
      />
    </div>
  );
}
