import { CM04_TICKS_PER_SECOND } from './gerarLanceCM04';
import type {
  HighlightClip,
  HighlightEventType,
  HighlightMode,
  SimulationFrame,
} from './types';

/** ~12s circular buffer at 20 Hz (idle pitch motion between clips). */
const BUFFER_CAPACITY = 12 * CM04_TICKS_PER_SECOND;

export type PlayHighlightHandler = (clip: HighlightClip) => void | Promise<void>;

/**
 * Headless circular replay buffer + event gate for CM 03/04-style 2D clips.
 * Live match clock is frozen by the UI while `playing` is true; frames themselves
 * carry a constant `clock` (minuto congelado) for the whole highlight.
 */
export class MatchHighlightManager {
  private mode: HighlightMode;
  private buffer: SimulationFrame[] = [];
  private playing = false;
  private onPlay: PlayHighlightHandler | null = null;

  constructor(mode: HighlightMode = 'ON') {
    this.mode = mode;
  }

  setMode(mode: HighlightMode): void {
    this.mode = mode;
  }

  getMode(): HighlightMode {
    return this.mode;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  onPlayHighlight(handler: PlayHighlightHandler): void {
    this.onPlay = handler;
  }

  /** Push one simulation tick into the circular buffer. */
  recordFrame(frame: SimulationFrame): void {
    if (this.mode === 'OFF') return;
    this.buffer.push(cloneFrame(frame));
    if (this.buffer.length > BUFFER_CAPACITY) {
      this.buffer.splice(0, this.buffer.length - BUFFER_CAPACITY);
    }
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  /** Snapshot current buffer as a clip (does not clear). */
  snapshotClip(event: HighlightEventType, clockAtEvent: number): HighlightClip {
    const frozen = Math.floor(clockAtEvent);
    return {
      event,
      frames: this.buffer.map((f) => {
        const c = cloneFrame(f);
        c.clock = frozen;
        return c;
      }),
      clockAtEvent: frozen,
    };
  }

  shouldTrigger(event: HighlightEventType): boolean {
    if (this.mode === 'OFF') return false;
    if (this.mode === 'ONLY_GOALS') return event === 'GOAL';
    return event === 'GOAL' || event === 'DANGEROUS_CHANCE';
  }

  /**
   * Play a pre-built CM04 clip (preferred). Freezes live match via onPlay
   * until the overlay signals done; then playback resumes at the next minute.
   */
  async playClip(clip: HighlightClip): Promise<boolean> {
    if (this.mode === 'OFF') return false;
    if (this.playing) return false;
    if (clip.frames.length === 0) return false;

    const frozen = Math.floor(clip.clockAtEvent);
    const normalized: HighlightClip = {
      ...clip,
      clockAtEvent: frozen,
      frames: clip.frames.map((f) => {
        const c = cloneFrame(f);
        c.clock = frozen;
        return c;
      }),
    };

    this.playing = true;
    try {
      await this.onPlay?.(normalized);
    } finally {
      this.playing = false;
    }
    return true;
  }

  /**
   * If mode allows, snapshot the buffer and invoke onPlayHighlight.
   * Prefer `playClip` with `buildCm04HighlightClip` for organic motion.
   */
  async evaluateAndTriggerEvent(
    event: HighlightEventType,
    clockAtEvent: number,
  ): Promise<boolean> {
    if (!this.shouldTrigger(event)) return false;
    if (this.playing) return false;
    if (this.buffer.length < CM04_TICKS_PER_SECOND) return false;

    const clip = this.snapshotClip(event, clockAtEvent);
    return this.playClip(clip);
  }

  /** Playback speed multiplier for requestAnimationFrame loops. */
  getPlaybackSpeed(): number {
    return this.mode === 'ONLY_GOALS' ? 1.15 : 1;
  }

  getTicksPerSecond(): number {
    return CM04_TICKS_PER_SECOND;
  }

  getBufferLength(): number {
    return this.buffer.length;
  }
}

function cloneFrame(f: SimulationFrame): SimulationFrame {
  return {
    clock: f.clock,
    ball: { ...f.ball },
    entities: f.entities.map((e) => ({ ...e })),
    ...(f.banner ? { banner: f.banner } : {}),
    ...(f.faseOrganica ? { faseOrganica: f.faseOrganica } : {}),
  };
}
