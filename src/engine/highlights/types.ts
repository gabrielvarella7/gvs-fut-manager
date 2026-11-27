/** CM 03/04-style 2D highlight types (coords 0..100, pitch space). */

export type HighlightMode = 'ON' | 'ONLY_GOALS' | 'OFF';

export type HighlightEventType = 'GOAL' | 'DANGEROUS_CHANCE';

export type HighlightFaseOrganica =
  | 'CONSTRUCAO'
  | 'PROGRESSAO'
  | 'ULTIMO_TERCO'
  | 'FINALIZACAO'
  | 'ENCERRAMENTO';

export interface HighlightEntity {
  id: number;
  nome: string;
  numero: number;
  /** 'H' home (mandante) · 'A' away */
  lado: 'H' | 'A';
  x: number;
  y: number;
  /** Ball carrier — used for label priority / glow. */
  temBola?: boolean;
}

export interface SimulationFrame {
  /**
   * Frozen match minute for the whole clip (e.g. 4 during a chance at 4').
   * Live clock only advances again AFTER ENCERRAMENTO when playback resumes.
   */
  clock: number;
  ball: { x: number; y: number; z?: number };
  entities: HighlightEntity[];
  /** Optional narration under the pitch (e.g. GOL!). */
  banner?: string;
  faseOrganica?: HighlightFaseOrganica;
}

export interface HighlightClip {
  event: HighlightEventType;
  frames: SimulationFrame[];
  /** Match minute at which the live clock was frozen for this clip. */
  clockAtEvent: number;
}

export interface HighlightRosterPlayer {
  id: number;
  nome: string;
  numero: number;
  posicao: string;
}

export interface HighlightRoster {
  mandante: HighlightRosterPlayer[];
  visitante: HighlightRosterPlayer[];
}

/** Metadata on a lance so the client can decide DANGEROUS_CHANCE. */
export interface HighlightLanceMeta {
  xg?: number;
  onTarget?: boolean;
  woodwork?: boolean;
  hardSave?: boolean;
  redCard?: boolean;
}
