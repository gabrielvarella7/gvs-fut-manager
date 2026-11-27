/** CM 03/04-style 2D highlight types (coords 0..100, pitch space). */

export type HighlightMode = 'ON' | 'ONLY_GOALS' | 'OFF';

export type HighlightEventType = 'GOAL' | 'DANGEROUS_CHANCE';

export interface HighlightEntity {
  id: number;
  nome: string;
  numero: number;
  /** 'H' home (mandante) · 'A' away */
  lado: 'H' | 'A';
  x: number;
  y: number;
}

export interface SimulationFrame {
  /** Match clock minutes (may include fraction). */
  clock: number;
  ball: { x: number; y: number };
  entities: HighlightEntity[];
  /** Optional label under the clock (e.g. GOL!). */
  banner?: string;
}

export interface HighlightClip {
  event: HighlightEventType;
  frames: SimulationFrame[];
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
