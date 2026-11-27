import type {
  HighlightClip,
  HighlightEventType,
  HighlightMode,
  SimulationFrame,
} from './types';

const TICKS_PER_SECOND = 10;
/** ~12s circular buffer at 10 Hz. */
const BUFFER_CAPACITY = 12 * TICKS_PER_SECOND;

export type PlayHighlightHandler = (clip: HighlightClip) => void | Promise<void>;

/**
 * Headless circular replay buffer + event gate for CM 03/04-style 2D clips.
 * Port of Gabriel’s MatchHighlightManager (integration guide).
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
    return {
      event,
      frames: this.buffer.map(cloneFrame),
      clockAtEvent,
    };
  }

  shouldTrigger(event: HighlightEventType): boolean {
    if (this.mode === 'OFF') return false;
    if (this.mode === 'ONLY_GOALS') return event === 'GOAL';
    return event === 'GOAL' || event === 'DANGEROUS_CHANCE';
  }

  /**
   * If mode allows, snapshot the buffer and invoke onPlayHighlight.
   * Returns true when a clip was started.
   */
  async evaluateAndTriggerEvent(
    event: HighlightEventType,
    clockAtEvent: number,
  ): Promise<boolean> {
    if (!this.shouldTrigger(event)) return false;
    if (this.playing) return false;
    if (this.buffer.length < TICKS_PER_SECOND) return false;

    const clip = this.snapshotClip(event, clockAtEvent);
    this.playing = true;
    try {
      await this.onPlay?.(clip);
    } finally {
      this.playing = false;
    }
    return true;
  }

  /** Playback speed multiplier for requestAnimationFrame loops. */
  getPlaybackSpeed(): number {
    return this.mode === 'ONLY_GOALS' ? 1.15 : 1;
  }

  getTicksPerSecond(): number {
    return TICKS_PER_SECOND;
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
  };
}
