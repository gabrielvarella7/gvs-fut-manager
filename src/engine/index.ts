export * from './matchEngine';
export {
  eventosMomentoDeLancamentos,
  finalizarSerieMomento,
  mesclarSerieMomento,
  momentoAteMinuto,
} from './matchMomentum';
export type { EventoMomento, PressaoMinuto } from './matchMomentum';
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