import { useEffect, useRef } from 'react';
import type { HighlightClip } from '../../../engine/highlights/types';
import { playClipOnCanvas } from './drawHighlightFrame';

type Props = {
  clip: HighlightClip | null;
  ticksPerSecond: number;
  playbackSpeed: number;
  onDone: () => void;
};

export function MatchHighlightOverlay({
  clip,
  ticksPerSecond,
  playbackSpeed,
  onDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef({ cancelled: false });

  useEffect(() => {
    cancelRef.current.cancelled = false;
    const canvas = canvasRef.current;
    if (!clip || !canvas) return;

    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? 640;
    canvas.width = Math.max(320, Math.floor(w));
    canvas.height = Math.max(180, Math.floor(canvas.width * 0.56));

    void playClipOnCanvas(
      canvas,
      clip.frames,
      ticksPerSecond,
      playbackSpeed,
      cancelRef.current,
    ).then(() => {
      if (!cancelRef.current.cancelled) onDone();
    });

    return () => {
      cancelRef.current.cancelled = true;
    };
  }, [clip, ticksPerSecond, playbackSpeed, onDone]);

  if (!clip) return null;

  const titulo = clip.event === 'GOAL' ? 'GOL!' : 'Chance perigosa';
  const minutoCongelado = Math.floor(clip.clockAtEvent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Replay · {titulo}
          </p>
          <p className="text-[10px] text-zinc-400">
            Minuto {minutoCongelado}&apos; congelado · CM 03/04
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className="block w-full bg-[#1a5c2e]"
          aria-label="Replay 2D do lance"
        />
      </div>
    </div>
  );
}
