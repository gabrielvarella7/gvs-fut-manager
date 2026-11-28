import React, { useEffect, useRef, useState } from 'react';
import { X, Eye, EyeOff, Trophy, Play } from 'lucide-react';
import type { LanceHighlightCompleto, KeyframeLance } from '../../engine/highlights/types';

export type FiltroReplayPartida = 'TODOS_LANCES' | 'SO_GOLS' | 'DESATIVADO';

interface PitchHighlight2DProps {
  lance: LanceHighlightCompleto | null;
  corMandante: string;
  corMandanteTexto?: string;
  corVisitante: string;
  corVisitanteTexto?: string;
  nomeMandante: string;
  nomeVisitante: string;
  placarMandante: number;
  placarVisitante: number;
  filtroReplay: FiltroReplayPartida;
  onAlterarFiltroReplay: (novoFiltro: FiltroReplayPartida) => void;
  onFecharOuConcluirLance: () => void;
}

export const PitchHighlight2D: React.FC<PitchHighlight2DProps> = ({
  lance,
  corMandante,
  corMandanteTexto = '#FFFFFF',
  corVisitante,
  corVisitanteTexto = '#FFFFFF',
  nomeMandante,
  nomeVisitante,
  placarMandante,
  placarVisitante,
  filtroReplay,
  onAlterarFiltroReplay,
  onFecharOuConcluirLance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [narracaoAtual, setNarracaoAtual] = useState<string>('');
  const [velocidadeReplay, setVelocidadeReplay] = useState<1 | 1.5>(1);
  const rastroBolaRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    if (!lance) return;
    const ehGol = lance.desfecho === 'GOL' || lance.desfecho === 'CONTRA_ATAQUE_GOL';
    if (filtroReplay === 'DESATIVADO' || (filtroReplay === 'SO_GOLS' && !ehGol)) {
      onFecharOuConcluirLance();
    }
  }, [lance, filtroReplay, onFecharOuConcluirLance]);

  useEffect(() => {
    if (!lance) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFecharOuConcluirLance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lance, onFecharOuConcluirLance]);

  useEffect(() => {
    if (!lance || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rastroBolaRef.current = [];
    let animationFrameId: number;
    let inicioTimestamp: number | null = null;
    let ultimaNarracao = '';

    const frames = lance.frames;
    if (!frames || frames.length === 0) {
      onFecharOuConcluirLance();
      return;
    }

    const renderizar = (timestamp: number) => {
      if (inicioTimestamp === null) inicioTimestamp = timestamp;
      const tempoDecorrido = ((timestamp - inicioTimestamp) / 1000) * velocidadeReplay;

      if (tempoDecorrido >= lance.duracaoTotalSegundos) {
        onFecharOuConcluirLance();
        return;
      }

      let idx = 0;
      while (idx < frames.length - 2 && frames[idx + 1].tempoSegundos <= tempoDecorrido) {
        idx++;
      }

      const f1: KeyframeLance = frames[idx];
      const f2: KeyframeLance = frames[Math.min(idx + 1, frames.length - 1)];
      const span = Math.max(0.001, f2.tempoSegundos - f1.tempoSegundos);
      const tBruto = Math.max(0, Math.min(1, (tempoDecorrido - f1.tempoSegundos) / span));
      const alpha = tBruto * tBruto * (3 - 2 * tBruto);

      if (f1.narracaoInstantanea && f1.narracaoInstantanea !== ultimaNarracao) {
        ultimaNarracao = f1.narracaoInstantanea;
        setNarracaoAtual(f1.narracaoInstantanea);
      }

      desenharGramado(ctx, canvas.width, canvas.height);

      const bx = f1.bola.x + (f2.bola.x - f1.bola.x) * alpha;
      const by = f1.bola.y + (f2.bola.y - f1.bola.y) * alpha;
      const bz = f1.bola.z + (f2.bola.z - f1.bola.z) * alpha;

      const pxBola = (bx / 100) * canvas.width;
      const pyBola = (by / 100) * canvas.height;

      rastroBolaRef.current.push({ x: pxBola, y: pyBola });
      if (rastroBolaRef.current.length > 14) rastroBolaRef.current.shift();

      if (f1.bola.estado === 'PASSE' || f1.bola.estado === 'CHUTE') {
        desenharRastroBola(ctx, rastroBolaRef.current);
      }

      const jogadoresInterpolados = f1.jogadores.map((j1, i) => {
        const j2 = f2.jogadores[i] || j1;
        const x = j1.x + (j2.x - j1.x) * alpha;
        const y = j1.y + (j2.y - j1.y) * alpha;
        const distBola = Math.hypot(x - bx, y - by);
        return { ...j1, x, y, distBola };
      });

      const maisProximosIds = new Set(
        [...jogadoresInterpolados]
          .sort((a, b) => a.distBola - b.distBola)
          .slice(0, 3)
          .map((j) => j.id)
      );

      for (const jog of jogadoresInterpolados) {
        const px = (jog.x / 100) * canvas.width;
        const py = (jog.y / 100) * canvas.height;
        const ehMandante = jog.time === 'MANDANTE';
        const corFundo = ehMandante ? corMandante : corVisitante;
        const corNumero = ehMandante ? corMandanteTexto : corVisitanteTexto;

        ctx.beginPath();
        ctx.arc(px, py + 3, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fill();

        if (jog.temBola) {
          ctx.beginPath();
          ctx.arc(px, py, 15.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fillStyle = corFundo;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.fillStyle = corNumero;
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(jog.numero), px, py + 0.5);

        if (jog.temBola || maisProximosIds.has(jog.id)) {
          ctx.font = '600 10px Inter, system-ui, sans-serif';
          const larguraTexto = ctx.measureText(jog.nomeCurto).width + 8;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(px - larguraTexto / 2, py + 14, larguraTexto, 14);
          ctx.fillStyle = '#F8FAFC';
          ctx.fillText(jog.nomeCurto, px, py + 21);
        }
      }

      const raioBola = 5.2 + bz * 1.4;
      ctx.beginPath();
      ctx.arc(pxBola + bz * 2, pyBola + 3 + bz * 3, 4.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pxBola, pyBola - bz * 3.5, raioBola, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      animationFrameId = requestAnimationFrame(renderizar);
    };

    animationFrameId = requestAnimationFrame(renderizar);
    return () => cancelAnimationFrame(animationFrameId);
  }, [lance, velocidadeReplay, corMandante, corMandanteTexto, corVisitante, corVisitanteTexto, onFecharOuConcluirLance]);

  if (!lance) return null;
  const ehGol = lance.desfecho === 'GOL' || lance.desfecho === 'CONTRA_ATAQUE_GOL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider ${
                ehGol
                  ? 'bg-emerald-500 text-slate-950 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {ehGol ? '⚽ GOL / REPLAY' : '🔥 LANCE PERIGOSO'} • {lance.minutoCongelado}'
            </span>
            <div className="text-sm font-bold text-white">
              {nomeMandante} <span className="text-emerald-400">{placarMandante}</span> x{' '}
              <span className="text-emerald-400">{placarVisitante}</span> {nomeVisitante}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => onAlterarFiltroReplay('TODOS_LANCES')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  filtroReplay === 'TODOS_LANCES' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Todos</span>
              </button>

              <button
                type="button"
                onClick={() => onAlterarFiltroReplay('SO_GOLS')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  filtroReplay === 'SO_GOLS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Só Gols</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onAlterarFiltroReplay('DESATIVADO');
                  onFecharOuConcluirLance();
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  filtroReplay === 'DESATIVADO' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sem Replays</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setVelocidadeReplay((v) => (v === 1 ? 1.5 : 1))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{velocidadeReplay}x</span>
            </button>

            <button
              type="button"
              onClick={onFecharOuConcluirLance}
              title="Fechar este replay/gol imediatamente (ESC)"
              aria-label="Fechar replay"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative bg-emerald-950 flex justify-center">
          <canvas ref={canvasRef} width={860} height={500} className="w-full h-auto max-h-[62vh] block" />
        </div>

        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-100 truncate">
            🎙️ {narracaoAtual || 'Acompanhe o desenvolvimento da jogada...'}
          </p>
          <button
            type="button"
            onClick={onFecharOuConcluirLance}
            className="text-xs text-slate-400 hover:text-white underline shrink-0 cursor-pointer"
          >
            Pular lance (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

function desenharGramado(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const faixas = 12;
  const larguraFaixa = w / faixas;
  for (let i = 0; i < faixas; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534';
    ctx.fillRect(i * larguraFaixa, 0, larguraFaixa + 1, h);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 2;
  const m = 22;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.beginPath();
  ctx.moveTo(w / 2, m);
  ctx.lineTo(w / 2, h - m);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 54, 0, Math.PI * 2);
  ctx.stroke();
  const areaW = 115, areaH = 240;
  ctx.strokeRect(m, (h - areaH) / 2, areaW, areaH);
  ctx.strokeRect(w - m - areaW, (h - areaH) / 2, areaW, areaH);
  const peqW = 42, peqH = 110;
  ctx.strokeRect(m, (h - peqH) / 2, peqW, peqH);
  ctx.strokeRect(w - m - peqW, (h - peqH) / 2, peqW, peqH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(m - 10, h / 2 - 34, 10, 68);
  ctx.fillRect(w - m, h / 2 - 34, 10, 68);
}

function desenharRastroBola(ctx: CanvasRenderingContext2D, pontos: Array<{ x: number; y: number }>) {
  if (pontos.length < 2) return;
  for (let i = 1; i < pontos.length; i++) {
    const alpha = (i / pontos.length) * 0.35;
    ctx.beginPath();
    ctx.moveTo(pontos[i - 1].x, pontos[i - 1].y);
    ctx.lineTo(pontos[i].x, pontos[i].y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = (i / pontos.length) * 4;
    ctx.stroke();
  }
}
