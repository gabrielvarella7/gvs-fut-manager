/**
 * Smoke: catálogo 30 lesões + epidemiologia + calibração Jul/estiramento.
 * Uso: npx --yes tsx scripts/smoke-injury-engine.mjs
 */
import assert from 'node:assert/strict';
import {
  CATALOGO_30_LESOES,
  definirLesaoPorId,
  multChanceLesaoFisiologistaEngine,
  multDuracaoFisioterapeutaEngine,
  somaPesosCatalogo,
  sortearDiagnosticoLesao,
  avaliarRiscoOcorrenciaLesao,
} from '../src/engine/injuryEngine.ts';

assert.equal(CATALOGO_30_LESOES.length, 30);
assert.ok(Math.abs(somaPesosCatalogo() - 100) < 1e-9, `pesos=${somaPesosCatalogo()}`);

assert.equal(multDuracaoFisioterapeutaEngine(11), 0.96);
assert.ok(Math.abs(multDuracaoFisioterapeutaEngine(20) - 0.6) < 1e-9);
assert.equal(multChanceLesaoFisiologistaEngine(20), 0.3);
assert.ok(Math.abs(multChanceLesaoFisiologistaEngine(13) - 0.79) < 1e-9);

const jogador = {
  id: 1,
  nome: 'Calibração',
  idade: 27,
  posicao: 'ATA',
  energia: 78,
  overall: 78,
  atributos: {
    tecnicos: {
      dominio: 12,
      passe: 12,
      chute: 12,
      cabeceio: 10,
      drible: 12,
      lancamentos: 10,
      bola_parada: 10,
    },
    mentais: {
      leitura_jogo: 12,
      cobertura: 10,
      criatividade: 11,
      agressividade: 11,
      lideranca: 10,
      pressao: 11,
    },
    fisicos: { fora_por_lesao: 12, velocidade: 14, forca: 12 },
  },
};

// Calibração: ESTIRAMENTO_POSTERIOR_G1 + dias brutos 20 × fisio 11 (0.96) → 19 dias
// diasMin 12 + floor(0.8 * 10) = 20
const diag = definirLesaoPorId(
  'ESTIRAMENTO_POSTERIOR_G1',
  jogador,
  11,
  'TREINO',
  () => 0.8,
);
assert.equal(diag.lesaoId, 'ESTIRAMENTO_POSTERIOR_G1');
assert.equal(diag.gravidade, 'MODERADA');
assert.equal(diag.diasBrutos, 20);
assert.equal(diag.diasRecuperacao, 19);
assert.match(diag.mancheteNoticia, /estiramento \(moderada\)\. Previsão de 19 dias\./);

const diagJul = sortearDiagnosticoLesao({
  jogador,
  contexto: 'TREINO',
  nivelFisioterapeuta: 11,
  mesAtual: 7,
  forcarLesaoId: 'ESTIRAMENTO_POSTERIOR_G1',
  rng: () => 0.8,
});
assert.equal(diagJul.diasRecuperacao, 19);

// GOL risco global bem menor que ATA
const riscoGol = avaliarRiscoOcorrenciaLesao({
  jogador: { ...jogador, posicao: 'GOL', propensao_lesao: 1 },
  contexto: 'JOGO',
  mesAtual: 6,
  nivelFisiologista: 10,
  rng: () => 1,
});
const riscoAta = avaliarRiscoOcorrenciaLesao({
  jogador: { ...jogador, posicao: 'ATA', propensao_lesao: 1 },
  contexto: 'JOGO',
  mesAtual: 6,
  nivelFisiologista: 10,
  rng: () => 1,
});
assert.ok(
  riscoGol.probabilidadeCalculada < riscoAta.probabilidadeCalculada * 0.5,
  `GOL ${riscoGol.probabilidadeCalculada} vs ATA ${riscoAta.probabilidadeCalculada}`,
);

// Elite fisio+fisiologista reduz risco e duração vs staff mediano
const riscoMedio = avaliarRiscoOcorrenciaLesao({
  jogador: { ...jogador, energia: 70, propensao_lesao: 1 },
  contexto: 'TREINO',
  mesAtual: 6,
  nivelFisiologista: 11,
  intensidadeTreino: 'EQUILIBRADO',
  exposicaoDias: 6,
  rng: () => 1,
});
const riscoElite = avaliarRiscoOcorrenciaLesao({
  jogador: { ...jogador, energia: 88, propensao_lesao: 1 },
  contexto: 'TREINO',
  mesAtual: 6,
  nivelFisiologista: 19,
  intensidadeTreino: 'REGENERATIVO',
  exposicaoDias: 6,
  rng: () => 1,
});
assert.ok(
  riscoElite.probabilidadeCalculada < riscoMedio.probabilidadeCalculada * 0.45,
  `elite ${riscoElite.probabilidadeCalculada} vs médio ${riscoMedio.probabilidadeCalculada}`,
);

console.log('smoke-injury-engine: OK', {
  pesos: somaPesosCatalogo(),
  calibracao: diag.mancheteNoticia,
});
