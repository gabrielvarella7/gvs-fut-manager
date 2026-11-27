export { MatchHighlightManager } from './MatchHighlightManager';
export { bindHighlightControls } from './bindHighlightControls';
export {
  buildCm04HighlightClip,
  CM04_TICKS_PER_SECOND,
  desfechoFromLance,
  gerarLanceHighlightCM04,
  lanceToSimulationFrames,
} from './gerarLanceCM04';
export {
  isDangerousChance,
  rosterFromEscalacao,
  synthesizeBuildupClip,
  synthesizeFrame,
} from './synthesizeFrames';
export type {
  HighlightClip,
  HighlightEntity,
  HighlightEventType,
  HighlightFaseOrganica,
  HighlightLanceMeta,
  HighlightMode,
  HighlightRoster,
  HighlightRosterPlayer,
  SimulationFrame,
} from './types';
