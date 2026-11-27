export * from './matchEngine';
export {
  gerarGraficoMomentum,
  mapearEstiloTatica,
  mesclarSerieMomento,
  momentoAteMinuto,
} from './matchMomentum';
export type { MomentumGraphInput, TacticStyle } from './matchMomentum';
export { simularPartidaNoWorker } from './runMatchInWorker';
export type { ContextoDinamicoPartida, ContextoNecessidade, ResultadoRecente } from './matchContext';
export {
  calcularFatorMoral,
  calcularNecessidade,
  detectarClassico,
  fatorFormaCampeonato,
  fatorFormaRecente,
  montarContextoPartidaDb,
  montarContextoPartidaSync,
} from './matchContext';