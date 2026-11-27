export * from './matchEngine';
export {
  CATALOGO_30_LESOES,
  avaliarRiscoOcorrenciaLesao,
  diagnosticarLesaoConfirmada,
  diasParaRodadasTreino,
  definirLesaoPorId,
  mesDeDataISO,
  montarEstadoLesaoDeDiagnostico,
  multChanceLesaoFisiologistaEngine,
  multDuracaoFisioterapeutaEngine,
  somaPesosCatalogo,
  sortearDiagnosticoLesao,
  tentarGerarLesao,
} from './injuryEngine';
export type {
  CategoriaLesao,
  ContextoOcorrencia,
  DefinicaoLesao,
  DiagnosticoGerado,
  GravidadeLesaoCatalogo,
} from './injuryEngine';
export {
  gerarColetivaPosJogo,
  processarRespostaColetiva,
} from './pressConferenceEngine';
export type {
  ColetivaPosJogo,
  OpcaoRespostaColetiva,
  ResultadoColetiva,
  TomRespostaColetiva,
} from './pressConferenceEngine';
export { BANCO_RESPOSTAS_COLETIVA, contagemBancoColetiva } from './pressConferenceBank';
export {
  aplicarDeltasMoralColetiva,
  fatorMoralMedioElenco,
  moralDe,
  MORAL_PADRAO,
} from './pressConferenceMoral';
export { montarColetivaPosPartida } from './pressConferenceFromMatch';
export type { ContextoColetivaMatch } from './pressConferenceFromMatch';
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
export {
  MatchHighlightManager,
  bindHighlightControls,
  buildCm04HighlightClip,
  gerarLanceHighlightCM04,
  isDangerousChance,
  rosterFromEscalacao,
  synthesizeBuildupClip,
  synthesizeFrame,
} from './highlights';
export type {
  HighlightClip,
  HighlightMode,
  HighlightRoster,
  SimulationFrame,
} from './highlights';
