export * from './matchEngine';
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